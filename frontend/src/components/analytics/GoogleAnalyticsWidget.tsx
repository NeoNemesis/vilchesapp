import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChartBarIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  MapPinIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import LeafletAnalyticsMap from './LeafletAnalyticsMap';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface GoogleAnalyticsWidgetProps {
  defaultDays?: number;
}

const GoogleAnalyticsWidget: React.FC<GoogleAnalyticsWidgetProps> = ({ defaultDays = 30 }) => {
  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Hämta fullständig analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['google-analytics', selectedDays],
    queryFn: async () => {
      const result = await api.getGoogleAnalyticsFull(selectedDays);
      setLastUpdated(new Date());
      return result;
    },
    refetchInterval: 5 * 60 * 1000, // Uppdatera var 5:e minut
  });

  // Hämta cache info
  const { data: cacheInfo } = useQuery({
    queryKey: ['analytics-cache-info'],
    queryFn: () => api.getAnalyticsCacheInfo(),
    refetchInterval: 30 * 1000, // Uppdatera var 30:e sekund
  });

  // Mutation för att rensa cache
  const clearCacheMutation = useMutation({
    mutationFn: () => api.clearAnalyticsCache(),
    onSuccess: () => {
      // Invalidera och refetch analytics data
      queryClient.invalidateQueries({ queryKey: ['google-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-cache-info'] });
      refetch();
    },
  });

  if (error) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <GlobeAltIcon className="h-5 w-5 mr-2 text-blue-600" />
            Google Analytics - Website
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">Kunde inte hämta Google Analytics data</p>
          <p className="text-sm text-gray-500 mt-2">{(error as any)?.message || 'Okänt fel'}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const data = analyticsData?.data;

  // Stats cards
  const statsCards = [
    {
      name: 'Totala besökare',
      value: data?.totalUsers || 0,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      name: 'Sessioner',
      value: data?.totalSessions || 0,
      icon: ChartBarIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      name: 'Kontaktformulär',
      value: data?.contactFormConversions || 0,
      icon: DocumentCheckIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: `${data?.totalUsers > 0 ? ((data.contactFormConversions / data.totalUsers) * 100).toFixed(1) : 0}% konvertering`,
    },
    {
      name: 'Aktiva just nu',
      value: data?.activeUsers || 0,
      icon: ArrowPathIcon,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  // Formatera trafikkällor för pie chart
  const trafficSourcesChart = (data?.trafficSources || []).map((source: any) => ({
    name: source.source === '(direct)' ? 'Direkt' :
          source.source === 'google' ? 'Google' :
          source.source,
    value: source.users,
  }));

  // Formatera toppsidor
  const topPagesData = (data?.topPages || []).slice(0, 5);

  // Formatera geografisk data
  const geographicData = (data?.geographicData || []).slice(0, 5);

  // Formatera trender
  const trendsData = (data?.trendsOverTime || []).map((trend: any) => ({
    date: new Date(trend.date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }),
    users: trend.users,
    sessions: trend.sessions,
  }));

  // Formatera tid sedan senaste uppdatering
  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} sekunder sedan`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minut${minutes !== 1 ? 'er' : ''} sedan`;
    const hours = Math.floor(minutes / 60);
    return `${hours} timm${hours !== 1 ? 'ar' : 'e'} sedan`;
  };

  return (
    <div className="space-y-6">
      {/* Header med period selector */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold flex items-center">
              <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              Website Analytics
            </h2>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">Google Analytics statistik från din hemsida</p>
            <div className="flex items-center flex-wrap mt-2 text-xs sm:text-sm text-blue-100">
              <ClockIcon className="h-4 w-4 mr-1" />
              Senast uppdaterad: {formatTimeSince(lastUpdated)}
              {cacheInfo?.data?.size > 0 && (
                <span className="ml-3 text-xs bg-blue-500/30 px-2 py-1 rounded">
                  {cacheInfo.data.size} cachade requests
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <div className="grid grid-cols-4 gap-1 sm:flex sm:space-x-2">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-center ${
                    selectedDays === days
                      ? 'bg-white text-blue-600 font-semibold shadow-md'
                      : 'bg-blue-500/30 text-white hover:bg-blue-500/50'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
              title="Rensa cache och hämta fresh data"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1 ${clearCacheMutation.isPending ? 'animate-spin' : ''}`} />
              {clearCacheMutation.isPending ? 'Rensar...' : 'Uppdatera data'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {statsCards.map((card) => (
          <div
            key={card.name}
            className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className={`${card.bgColor} rounded-lg sm:rounded-xl p-2 sm:p-3`}>
                  <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.textColor}`} />
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{card.name}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Trender över tid */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-600" />
            Trender över tid
          </h3>
          <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Besökare"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#10b981"
                strokeWidth={2}
                name="Sessioner"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trafikkällor */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-green-600" />
            Trafikkällor
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
            <PieChart>
              <Pie
                data={trafficSourcesChart}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={5}
                dataKey="value"
                label={(entry) => entry.name}
              >
                {trafficSourcesChart.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {(data?.trafficSources || []).slice(0, 5).map((source: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-gray-700">{source.source}</span>
                </div>
                <span className="font-semibold text-gray-900">{source.users}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Konverteringar & Kontakter - NY WIDGET! */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentCheckIcon className="h-5 w-5 mr-2 text-purple-600" />
            Kundkontakter
          </h3>

          {/* Huvudmetrics */}
          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Totalt formulärskick</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {data?.contactFormConversions || 0}
                  </p>
                </div>
                <div className="bg-purple-200 rounded-full p-3">
                  <DocumentCheckIcon className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Konverteringsrate</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {data?.conversionRate ? `${data.conversionRate}%` : '0%'}
                  </p>
                </div>
                <div className="bg-green-200 rounded-full p-3">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2">
                {data?.totalUsers || 0} besökare totalt
              </p>
            </div>
          </div>

          {/* Förklaring */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Visar alla formulärskick</strong> från din hemsida (kontaktformulär, offerter, etc).
              Konverteringsrate = andelen besökare som skickar formulär.
            </p>
          </div>
        </div>

        {/* Geografisk data - Interaktiv Karta */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2 text-purple-600" />
            Besökare per stad
          </h3>
          <LeafletAnalyticsMap data={geographicData} />
        </div>

        {/* Populäraste sidor */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentCheckIcon className="h-5 w-5 mr-2 text-orange-600" />
            Populäraste sidor
          </h3>
          <div className="space-y-3">
            {topPagesData.map((page: any, index: number) => {
              const maxViews = topPagesData[0]?.views || 1;
              const percentage = (page.views / maxViews) * 100;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 truncate flex-1 mr-4">
                      {page.page}
                    </span>
                    <span className="text-gray-900 font-semibold whitespace-nowrap">
                      {page.views} visningar
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleAnalyticsWidget;
