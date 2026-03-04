import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CalendarDaysIcon,
  BellIcon,
  CheckCircleIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import GoogleAnalyticsWidget from '../../components/analytics/GoogleAnalyticsWidget';
import N8nAutomationsWidget from '../../components/automations/N8nAutomationsWidget';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getDashboardStats(),
    retry: 2,
    staleTime: 30000,
  });

  // Hämta senaste projekt - fallback till alla projekt om API misslyckas
  const { data: recentOrders, error: recentOrdersError } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: async () => {
      try {
        return await api.getRecentProjects();
      } catch {
        try {
          const allProjects = await api.getAllProjects();
          return Array.isArray(allProjects)
            ? allProjects
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
            : [];
        } catch {
          return [];
        }
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Hämta verklig analytics-data (används för statistik-kort)
  const { data: analytics } = useQuery({
    queryKey: ['analytics', '30d'],
    queryFn: () => api.getAnalytics('30d'),
    staleTime: 60000,
  });

  // Hämta senaste aktiviteter från notifikationer
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: api.getRecentActivities,
    retry: 1,
    staleTime: 30000,
  });


  const projectStatusData = [
    { name: 'Pågående', value: stats?.inProgress || 0, color: '#3B82F6' },
    { name: 'Väntar', value: stats?.unassigned || 0, color: '#EF4444' },
    { name: 'Rapporterade', value: stats?.pendingReports || 0, color: '#10B981' },
    { name: 'Färdiga', value: stats?.completed || 0, color: '#8B5CF6' },
  ];

  const quoteStatusData = [
    { name: 'Skickade', value: stats?.sentQuotes || 0, color: '#3B82F6' },
    { name: 'Godkända', value: stats?.acceptedQuotes || 0, color: '#10B981' },
    { name: 'Nekade', value: stats?.rejectedQuotes || 0, color: '#EF4444' },
    { name: 'Utkast', value: stats?.draftQuotes || 0, color: '#9CA3AF' },
    { name: 'Utgångna', value: stats?.expiredQuotes || 0, color: '#F97316' },
  ];

  const statCards = [
    {
      name: 'Otilldelade projekt',
      value: stats?.unassigned || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/admin/projects?status=PENDING',
      change: analytics?.stats?.unassigned ? `${analytics.stats.unassigned.change > 0 ? '+' : ''}${analytics.stats.unassigned.change}%` : '0%',
      changeType: analytics?.stats?.unassigned?.changeType || 'neutral'
    },
    {
      name: 'Pågående uppdrag',
      value: stats?.inProgress || 0,
      icon: ClockIcon,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/admin/projects?status=IN_PROGRESS',
      change: analytics?.stats?.inProgress ? `${analytics.stats.inProgress.change > 0 ? '+' : ''}${analytics.stats.inProgress.change}%` : '0%',
      changeType: analytics?.stats?.inProgress?.changeType || 'neutral'
    },
    {
      name: 'Väntande rapporter',
      value: stats?.pendingReports || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/admin/reports',
      change: analytics?.stats?.pendingReports ? `${analytics.stats.pendingReports.change > 0 ? '+' : ''}${analytics.stats.pendingReports.change}%` : '0%',
      changeType: analytics?.stats?.pendingReports?.changeType || 'neutral'
    },
    {
      name: 'Aktiva entreprenörer',
      value: stats?.activeEntrepreneurs || 0,
      icon: UserGroupIcon,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/admin/contractors',
      change: analytics?.stats?.activeContractors ? `${analytics.stats.activeContractors.change > 0 ? '+' : ''}${analytics.stats.activeContractors.change}%` : '0%',
      changeType: analytics?.stats?.activeContractors?.changeType || 'neutral'
    }
  ];

  const quickActions = [
    {
      name: 'Skapa nytt projekt',
      description: 'Lägg till ett nytt projekt',
      icon: DocumentPlusIcon,
      color: 'bg-blue-600 hover:bg-blue-700',
      link: '/admin/projects'
    },
    {
      name: 'Lägg till entreprenör',
      description: 'Registrera ny entreprenör',
      icon: UserPlusIcon,
      color: 'bg-green-600 hover:bg-green-700',
      link: '/admin/contractors?new=true'
    },
    {
      name: 'Se alla rapporter',
      description: 'Granska inlämnade rapporter',
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-purple-600 hover:bg-purple-700',
      link: '/admin/reports'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Välkommen tillbaka, {user?.name}!</h1>
            <p className="text-blue-100 mt-2">Här är en översikt över ditt företag och alla projekt.</p>
            <div className="flex items-center mt-4 space-x-6 text-sm">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                {format(new Date(), 'EEEE, d MMMM yyyy', { locale: sv })}
              </div>
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                Dashboard
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <SparklesIcon className="h-20 w-20 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.name}
            to={card.link}
            className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`${card.bgColor} rounded-xl p-3`}>
                  <card.icon className={`h-6 w-6 ${card.textColor}`} />
                </div>
                <div className="flex items-center text-sm">
                  {card.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : card.changeType === 'decrease' ? (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <div className="h-4 w-4 mr-1" />
                  )}
                  <span className={
                    card.changeType === 'increase' ? 'text-green-600' : 
                    card.changeType === 'decrease' ? 'text-red-600' : 
                    'text-gray-500'
                  }>
                    {card.change}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {card.name}
                </dt>
                <dd className="text-3xl font-bold text-gray-900 mt-1">
                  {card.value}
                </dd>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-blue-600" />
          Snabba åtgärder
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.link}
              className={`${action.color} text-white rounded-lg p-4 flex items-center space-x-3 transition-colors duration-200`}
            >
              <action.icon className="h-6 w-6" />
              <div>
                <p className="font-medium">{action.name}</p>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts and Automations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Status Pie Chart */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <ChartPieIcon className="h-5 w-5 mr-2 text-purple-600" />
            Projektstatus
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={projectStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {projectStatusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Totalt projekt</span>
              <span className="text-xl font-bold text-gray-900">
                {projectStatusData.reduce((sum, item) => sum + item.value, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Quote Status Pie Chart */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
            Offertstatus
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={quoteStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {quoteStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {quoteStatusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          {/* Total and acceptance rate */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Totalt offerter</span>
              <span className="text-xl font-bold text-gray-900">
                {stats?.totalQuotes || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Acceptansgrad</span>
              <span className="text-lg font-semibold text-green-600">
                {stats?.quoteAcceptanceRate || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* n8n Automations Widget */}
      <N8nAutomationsWidget />

      {/* Google Analytics från Website */}
      <GoogleAnalyticsWidget defaultDays={30} />

      {/* Recent Activity & Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
                Senaste projekt
              </h3>
              <Link
                to="/admin/projects"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
              >
                Visa alla
                <ArrowTrendingUpIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recentOrdersError ? (
              <div className="px-6 py-4 text-center text-red-600">
                <p>Fel vid hämtning av senaste projekt</p>
                <p className="text-sm text-red-500 mt-1">{recentOrdersError.message}</p>
              </div>
            ) : Array.isArray(recentOrders) ? recentOrders.slice(0, 5).map((order: any) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <Link to={`/admin/projects/${order.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {order.title}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        <span className="truncate">{order.address}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'PENDING' ? 'bg-red-100 text-red-800' :
                        order.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'REPORTED' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {order.status === 'PENDING' ? 'Väntar' :
                         order.status === 'ASSIGNED' ? 'Tilldelad' :
                         order.status === 'IN_PROGRESS' ? 'Pågående' :
                         order.status === 'REPORTED' ? 'Rapporterad' :
                         'Godkänd'}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        {format(new Date(order.createdAt), 'd MMM', { locale: sv })}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )) : (
              <div className="px-6 py-4 text-center text-gray-500">
                <p>Inga projekt att visa</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-orange-600" />
              Senaste aktivitet
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <div className="px-6 py-4 space-y-4">
              {Array.isArray(recentActivities) && recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity: any) => {
                  // Bestäm ikon och färg baserat på aktivitetstyp
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'PROJECT_ASSIGNED': return { Icon: UserPlusIcon, color: 'bg-blue-100 text-blue-600' };
                      case 'REPORT_SUBMITTED': return { Icon: DocumentPlusIcon, color: 'bg-green-100 text-green-600' };
                      case 'PROJECT_COMPLETED': return { Icon: CheckCircleIcon, color: 'bg-green-100 text-green-600' };
                      case 'LOGIN_SUCCESS': return { Icon: UserIcon, color: 'bg-gray-100 text-gray-600' };
                      case 'DEADLINE_REMINDER': return { Icon: ClockIcon, color: 'bg-yellow-100 text-yellow-600' };
                      default: return { Icon: BellIcon, color: 'bg-gray-100 text-gray-600' };
                    }
                  };

                  const { Icon, color } = getActivityIcon(activity.type);

                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`rounded-full p-1 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {activity.title}
                          {activity.project && (
                            <span className="text-gray-600"> - {activity.project}</span>
                          )}
                        </p>
                        {activity.message && activity.message !== activity.title && (
                          <p className="text-xs text-gray-600 mt-1">
                            {activity.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(activity.timestamp), 'd MMM HH:mm', { locale: sv })}
                          {activity.user && activity.user !== 'System' && (
                            <span> • {activity.user}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <BellIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p>Inga aktiviteter att visa</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 