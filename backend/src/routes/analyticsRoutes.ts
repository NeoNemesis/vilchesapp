import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import googleAnalyticsService from '../services/googleAnalyticsService';

const router = Router();

// Skydda alla analytics-endpoints - endast admin ska ha tillgång
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/analytics/summary?days=7
// Returnerar en sammanfattning av analytics-data
router.get('/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const [overview, topPages] = await Promise.all([
      googleAnalyticsService.getOverview(days),
      googleAnalyticsService.getTopPages(days),
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        visitors: overview.totalVisitors,
        pageViews: overview.totalPageViews,
        avgSessionDuration: overview.avgSessionDuration,
        bounceRate: overview.bounceRate,
        topPages: topPages.slice(0, 5),
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta analytics-sammanfattning',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/full?days=30
// Returnerar fullständig analytics-data
router.get('/full', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const [overview, newVsReturning, trafficSources, topPages, devices, geoData, trendsData, conversions, realtimeData] = await Promise.all([
      googleAnalyticsService.getOverview(days),
      googleAnalyticsService.getNewVsReturning(days),
      googleAnalyticsService.getTrafficSources(days),
      googleAnalyticsService.getTopPages(days),
      googleAnalyticsService.getDeviceTypes(days),
      googleAnalyticsService.getGeographicData(days),
      googleAnalyticsService.getTrends(days),
      googleAnalyticsService.getContactFormConversions(days),
      googleAnalyticsService.getRealtimeActiveUsers(),
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,

        // Top-level metrics (flattened from overview)
        totalUsers: overview.totalVisitors,
        totalSessions: overview.totalSessions,
        totalPageViews: overview.totalPageViews,
        avgSessionDuration: overview.avgSessionDuration,
        bounceRate: overview.bounceRate,

        // Conversion metrics
        contactFormConversions: conversions.conversions,
        conversionRate: parseFloat(conversions.conversionRate),

        // Real-time active users
        activeUsers: realtimeData.activeUsers,

        // Traffic sources as array
        trafficSources: trafficSources.map(source => ({
          source: source.name,
          users: source.visitors,
          percentage: source.percentage
        })),

        // Top pages with correct field names
        topPages: topPages.map(page => ({
          page: page.path,
          views: page.views,
          avgTime: page.avgTime
        })),

        // Geographic data
        geographicData: geoData.cities.map((city: any) => ({
          city: city.name,
          users: city.visitors,
        })),

        // Trends over time (was missing)
        trendsOverTime: trendsData.trends.map(trend => ({
          date: trend.date,
          users: trend.visitors,
          sessions: trend.sessions,
        })),

        // Keep for backward compatibility
        newVsReturning,
        devices,
      }
    });
  } catch (error) {
    console.error('Error fetching full analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta fullständig analytics-data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/traffic-sources?days=30
// Returnerar trafikkällor
router.get('/traffic-sources', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const sources = await googleAnalyticsService.getTrafficSources(days);

    // Separera ut olika typer av källor
    const searchEngines = sources.filter(s =>
      s.name.toLowerCase().includes('search') || s.name.toLowerCase().includes('organisk')
    );

    const socialNetworks = sources.filter(s =>
      s.name.toLowerCase().includes('social')
    );

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        sources,
        searchEngines: searchEngines.length > 0 ? searchEngines : [
          { name: 'Inga sökmotor-data', visitors: 0, percentage: 0 }
        ],
        socialNetworks: socialNetworks.length > 0 ? socialNetworks : [
          { name: 'Inga social media-data', visitors: 0, percentage: 0 }
        ],
      }
    });
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta trafikkällor',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/geographic?days=30
// Returnerar geografisk data
router.get('/geographic', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const geoData = await googleAnalyticsService.getGeographicData(days);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        ...geoData,
      }
    });
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta geografisk data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/trends?days=30
// Returnerar trenddata över tid
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const trendsData = await googleAnalyticsService.getTrends(days);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        ...trendsData,
      }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta trenddata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/analytics/cache/clear
// Rensar analytics-cache för att tvinga fram fresh data
router.post('/cache/clear', (req, res) => {
  try {
    googleAnalyticsService.clearCache();
    res.json({
      success: true,
      message: 'Cache rensad. Nästa request kommer hämta fresh data från Google Analytics.',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte rensa cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/cache/info
// Returnerar information om cache-status
router.get('/cache/info', (req, res) => {
  try {
    const cacheInfo = googleAnalyticsService.getCacheInfo();
    res.json({
      success: true,
      data: cacheInfo,
    });
  } catch (error) {
    console.error('Error fetching cache info:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta cache-info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
