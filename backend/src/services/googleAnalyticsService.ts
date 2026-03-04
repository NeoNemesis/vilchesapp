import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

interface CacheEntry {
  data: any;
  timestamp: number;
}

class GoogleAnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient;
  private propertyId: string;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minuter cache

  constructor() {
    // Hitta credentials-filen
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                           path.join(__dirname, '../../../analytics-credentials.json');

    this.propertyId = process.env.GA4_PROPERTY_ID || '';

    // Initiera Google Analytics Data API-klient
    this.analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: credentialsPath,
    });

    // Initiera cache
    this.cache = new Map();

    console.log('✅ Google Analytics Service initierad med Property ID:', this.propertyId);
    console.log('✅ Cache aktiverad med TTL:', this.CACHE_TTL / 1000, 'sekunder');
  }

  /**
   * Hämta data från cache eller GA4 API
   */
  private async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📦 Cache hit för: ${cacheKey} (${Math.round((now - cached.timestamp) / 1000)}s gammal)`);
      return cached.data as T;
    }

    console.log(`🔄 Cache miss för: ${cacheKey}, hämtar från GA4...`);
    const data = await fetchFn();
    this.cache.set(cacheKey, { data, timestamp: now });

    return data;
  }

  /**
   * Rensa cache (kan användas vid behov)
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache rensad');
  }

  /**
   * Hämta cache-status och metadata
   */
  public getCacheInfo() {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((Date.now() - entry.timestamp) / 1000), // sekunder
      expiresIn: Math.round((this.CACHE_TTL - (Date.now() - entry.timestamp)) / 1000), // sekunder
    }));

    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL / 1000, // sekunder
      entries,
    };
  }

  /**
   * Hämta grundläggande översikt-data
   */
  async getOverview(days: number = 30) {
    return this.getCachedOrFetch(`overview-${days}`, async () => {
      try {
        const [response] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today', // Använd 'yesterday' för mer tillförlitlig data
            },
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
          dimensions: [],
        });

        const row = response.rows?.[0];
        if (!row) {
          console.warn('⚠️ Ingen data tillgänglig från GA4 för översikt');
          return {
            totalVisitors: 0,
            totalPageViews: 0,
            totalSessions: 0,
            avgSessionDuration: '0:00',
            bounceRate: '0%',
          };
        }

        return {
          totalVisitors: parseInt(row.metricValues?.[0]?.value || '0'),
          totalPageViews: parseInt(row.metricValues?.[1]?.value || '0'),
          totalSessions: parseInt(row.metricValues?.[2]?.value || '0'),
          avgSessionDuration: this.formatDuration(parseFloat(row.metricValues?.[3]?.value || '0')),
          bounceRate: `${(parseFloat(row.metricValues?.[4]?.value || '0') * 100).toFixed(1)}%`,
        };
      } catch (error) {
        console.error('❌ Error fetching overview:', error);
        throw error;
      }
    });
  }

  /**
   * Hämta nya vs återkommande användare
   */
  async getNewVsReturning(days: number = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'newVsReturning' }],
      });

      let newUsers = 0;
      let returningUsers = 0;
      const total = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0') +
                   parseInt(response.rows?.[1]?.metricValues?.[0]?.value || '0');

      response.rows?.forEach(row => {
        const dimension = row.dimensionValues?.[0]?.value;
        const value = parseInt(row.metricValues?.[0]?.value || '0');

        if (dimension === 'new') {
          newUsers = value;
        } else if (dimension === 'returning') {
          returningUsers = value;
        }
      });

      return {
        new: total > 0 ? Math.round((newUsers / total) * 100) : 0,
        returning: total > 0 ? Math.round((returningUsers / total) * 100) : 0,
      };
    } catch (error) {
      console.error('Error fetching new vs returning:', error);
      throw error;
    }
  }

  /**
   * Hämta trafikkällor
   */
  async getTrafficSources(days: number = 30) {
    return this.getCachedOrFetch(`traffic-sources-${days}`, async () => {
      try {
        const [response] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today',
            },
          ],
          metrics: [{ name: 'activeUsers' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 10,
        });

        const sources = response.rows?.map(row => ({
          name: this.translateChannelGroup(row.dimensionValues?.[0]?.value || 'Unknown'),
          visitors: parseInt(row.metricValues?.[0]?.value || '0'),
        })) || [];

        // Beräkna procent
        const total = sources.reduce((sum, s) => sum + s.visitors, 0);
        return sources.map(s => ({
          ...s,
          percentage: total > 0 ? Math.round((s.visitors / total) * 100) : 0,
        }));
      } catch (error) {
        console.error('❌ Error fetching traffic sources:', error);
        throw error;
      }
    });
  }

  /**
   * Hämta toppidor (mest besökta sidor)
   */
  async getTopPages(days: number = 30) {
    return this.getCachedOrFetch(`top-pages-${days}`, async () => {
      try {
        const [response] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
          dimensions: [{ name: 'pagePath' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        });

        return response.rows?.map(row => ({
          path: row.dimensionValues?.[0]?.value || '/',
          views: parseInt(row.metricValues?.[0]?.value || '0'),
          avgTime: this.formatDuration(parseFloat(row.metricValues?.[1]?.value || '0')),
        })) || [];
      } catch (error) {
        console.error('❌ Error fetching top pages:', error);
        throw error;
      }
    });
  }

  /**
   * Hämta enhetstyper (mobile, desktop, tablet)
   */
  async getDeviceTypes(days: number = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'deviceCategory' }],
      });

      const devices: any = {
        mobile: 0,
        desktop: 0,
        tablet: 0,
      };

      response.rows?.forEach(row => {
        const device = row.dimensionValues?.[0]?.value?.toLowerCase() || '';
        const value = parseInt(row.metricValues?.[0]?.value || '0');

        if (device === 'mobile') {
          devices.mobile = value;
        } else if (device === 'desktop') {
          devices.desktop = value;
        } else if (device === 'tablet') {
          devices.tablet = value;
        }
      });

      const total = devices.mobile + devices.desktop + devices.tablet;

      return {
        mobile: total > 0 ? Math.round((devices.mobile / total) * 100) : 0,
        desktop: total > 0 ? Math.round((devices.desktop / total) * 100) : 0,
        tablet: total > 0 ? Math.round((devices.tablet / total) * 100) : 0,
      };
    } catch (error) {
      console.error('Error fetching device types:', error);
      throw error;
    }
  }

  /**
   * Hämta geografisk data
   */
  async getGeographicData(days: number = 30) {
    try {
      // Länder
      const [countriesResponse] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'country' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      });

      // Städer
      const [citiesResponse] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'city' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      });

      // Språk
      const [languagesResponse] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'language' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      });

      const countries = countriesResponse.rows?.map(row => ({
        name: row.dimensionValues?.[0]?.value || 'Unknown',
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      })) || [];

      const cities = citiesResponse.rows?.map(row => ({
        name: row.dimensionValues?.[0]?.value || 'Unknown',
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      })) || [];

      const languages = languagesResponse.rows?.map(row => ({
        name: this.getLanguageName(row.dimensionValues?.[0]?.value || ''),
        code: row.dimensionValues?.[0]?.value || 'unknown',
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      })) || [];

      // Beräkna procent
      const totalCountries = countries.reduce((sum, c) => sum + c.visitors, 0);
      const totalCities = cities.reduce((sum, c) => sum + c.visitors, 0);
      const totalLanguages = languages.reduce((sum, l) => sum + l.visitors, 0);

      return {
        countries: countries.map(c => ({
          ...c,
          code: this.getCountryCode(c.name),
          percentage: totalCountries > 0 ? Math.round((c.visitors / totalCountries) * 100) : 0,
        })),
        cities: cities.map(c => ({
          ...c,
          percentage: totalCities > 0 ? Math.round((c.visitors / totalCities) * 100) : 0,
        })),
        languages: languages.map(l => ({
          ...l,
          percentage: totalLanguages > 0 ? Math.round((l.visitors / totalLanguages) * 100) : 0,
        })),
      };
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      throw error;
    }
  }

  /**
   * Hämta trenddata över tid
   */
  async getTrends(days: number = 30) {
    return this.getCachedOrFetch(`trends-${days}`, async () => {
      try {
        const [response] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        });

        const trends = response.rows?.map(row => {
          const dateStr = row.dimensionValues?.[0]?.value || '';
          const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;

          return {
            date,
            visitors: parseInt(row.metricValues?.[0]?.value || '0'),
            sessions: parseInt(row.metricValues?.[1]?.value || '0'),
            pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
            conversions: 0, // Kan läggas till senare om konverteringar är konfigurerade
          };
        }) || [];

        // Beräkna tillväxt (jämför första och sista perioden)
        const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
        const secondHalf = trends.slice(Math.floor(trends.length / 2));

        const firstHalfVisitors = firstHalf.reduce((sum, t) => sum + t.visitors, 0);
        const secondHalfVisitors = secondHalf.reduce((sum, t) => sum + t.visitors, 0);

        const firstHalfPageViews = firstHalf.reduce((sum, t) => sum + t.pageViews, 0);
        const secondHalfPageViews = secondHalf.reduce((sum, t) => sum + t.pageViews, 0);

        const visitorsGrowth = firstHalfVisitors > 0
          ? ((secondHalfVisitors - firstHalfVisitors) / firstHalfVisitors * 100).toFixed(1)
          : '0';

        const pageViewsGrowth = firstHalfPageViews > 0
          ? ((secondHalfPageViews - firstHalfPageViews) / firstHalfPageViews * 100).toFixed(1)
          : '0';

        return {
          trends,
          growth: {
            visitors: `${visitorsGrowth > '0' ? '+' : ''}${visitorsGrowth}%`,
            pageViews: `${pageViewsGrowth > '0' ? '+' : ''}${pageViewsGrowth}%`,
            conversions: '+0%', // Placeholder
          },
        };
      } catch (error) {
        console.error('❌ Error fetching trends:', error);
        throw error;
      }
    });
  }

  /**
   * Hämta kontaktformulär-konverteringar
   * Fångar ALLA formulärskick från website
   * Använder GA4 form_submit events + andra custom events
   */
  async getContactFormConversions(days: number = 30) {
    return this.getCachedOrFetch(`conversions-${days}`, async () => {
      try {
        console.log('🔍 Hämtar formulärskick för', days, 'dagar...');

        // Query 1: Get ALL form-related events (form_submit, submit, contact, etc.)
        const [allEventsResponse] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'eventCount' }
          ],
          dimensions: [
            { name: 'eventName' }
          ],
        });

        // Filtrera ut alla formulär-relaterade events
        const formEvents = allEventsResponse.rows?.filter(row => {
          const eventName = (row.dimensionValues?.[0]?.value || '').toLowerCase();
          return eventName.includes('form') ||
                 eventName.includes('submit') ||
                 eventName.includes('contact') ||
                 eventName === 'generate_lead';
        }) || [];

        // Summera alla formulärskick
        let totalFormSubmissions = 0;
        formEvents.forEach(row => {
          const count = parseInt(row.metricValues?.[0]?.value || '0');
          const eventName = row.dimensionValues?.[0]?.value || 'unknown';
          console.log(`  📋 Event: ${eventName} = ${count} gånger`);
          totalFormSubmissions += count;
        });

        console.log(`✅ Totalt ${totalFormSubmissions} formulärskick från ${formEvents.length} olika event-typer`);

        // Query 2: Get total users for conversion rate
        const [usersResponse] = await this.analyticsDataClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'activeUsers' }
          ],
        });

        const totalUsers = parseInt(usersResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
        const conversionRate = totalUsers > 0 ? (totalFormSubmissions / totalUsers) * 100 : 0;

        console.log(`📊 Konverteringsrate: ${conversionRate.toFixed(2)}% (${totalFormSubmissions}/${totalUsers})`);

        return {
          conversions: totalFormSubmissions,
          conversionRate: conversionRate.toFixed(2),
          totalUsers,
          eventBreakdown: formEvents.map(row => ({
            eventName: row.dimensionValues?.[0]?.value || 'unknown',
            count: parseInt(row.metricValues?.[0]?.value || '0'),
          })),
        };
      } catch (error) {
        console.error('❌ Error fetching contact form conversions:', error);
        // Return zeros instead of throwing to avoid breaking dashboard
        return {
          conversions: 0,
          conversionRate: '0.00',
          totalUsers: 0,
          eventBreakdown: [],
        };
      }
    });
  }

  /**
   * Hämta realtid aktiva användare (sista 30 minuterna)
   */
  async getRealtimeActiveUsers() {
    try {
      const [response] = await this.analyticsDataClient.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        metrics: [
          { name: 'activeUsers' }
        ],
      });

      const activeUsers = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0');

      return {
        activeUsers,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching realtime active users:', error);
      return {
        activeUsers: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Debug: Hämta ALLA events för att se vad som trackas
   * Används för att troubleshoota formulär-tracking
   */
  async getAllEvents(days: number = 7) {
    try {
      console.log('🔍 DEBUG: Hämtar ALLA events från GA4...');

      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        metrics: [
          { name: 'eventCount' }
        ],
        dimensions: [
          { name: 'eventName' }
        ],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 50,
      });

      const events = response.rows?.map(row => ({
        eventName: row.dimensionValues?.[0]?.value || 'unknown',
        count: parseInt(row.metricValues?.[0]?.value || '0'),
      })) || [];

      console.log(`📊 Hittade ${events.length} olika event-typer:`);
      events.forEach(event => {
        const isFormRelated = event.eventName.toLowerCase().includes('form') ||
                               event.eventName.toLowerCase().includes('submit') ||
                               event.eventName.toLowerCase().includes('contact');
        console.log(`  ${isFormRelated ? '📋' : '  '} ${event.eventName}: ${event.count}`);
      });

      return events;
    } catch (error) {
      console.error('❌ Error fetching all events:', error);
      return [];
    }
  }

  /**
   * Hjälpmetoder
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private translateChannelGroup(group: string): string {
    const translations: { [key: string]: string } = {
      'Organic Search': 'Organisk sökning',
      'Direct': 'Direkt',
      'Referral': 'Hänvisning',
      'Social': 'Sociala medier',
      'Paid Search': 'Betald sökning',
      'Email': 'Email',
      'Display': 'Display',
      'Organic Social': 'Organisk social',
      'Unknown': 'Okänd',
    };
    return translations[group] || group;
  }

  private getCountryCode(country: string): string {
    const codes: { [key: string]: string } = {
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Germany': 'DE',
    };
    return codes[country] || 'XX';
  }

  private getLanguageName(code: string): string {
    const names: { [key: string]: string } = {
      'sv': 'Swedish',
      'en': 'English',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'de': 'German',
    };
    return names[code] || code;
  }
}

export default new GoogleAnalyticsService();
