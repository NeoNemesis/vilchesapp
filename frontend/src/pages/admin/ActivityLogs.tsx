import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: string;
  type: string;
  typeLabel: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  subject: string;
  message: string;
  ip: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
  project: { id: string; title: string } | null;
  isRead: boolean;
  createdAt: string;
}

interface LogStats {
  totalEvents: number;
  securityEvents: number;
  failedLogins: number;
  successfulLogins: number;
  last24h: Array<{ type: string; typeLabel: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: XCircleIcon,
    label: 'Kritisk',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    icon: ExclamationTriangleIcon,
    label: 'Varning',
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
    icon: CheckCircleIcon,
    label: 'OK',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: InformationCircleIcon,
    label: 'Info',
  },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'Alla kategorier' },
  { value: 'security', label: 'Säkerhet' },
  { value: 'project', label: 'Projekt' },
  { value: 'quote', label: 'Offerter' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'Alla nivåer' },
  { value: 'critical', label: 'Kritisk' },
  { value: 'warning', label: 'Varning' },
  { value: 'success', label: 'OK' },
  { value: 'info', label: 'Info' },
];

const DAYS_OPTIONS = [
  { value: 7, label: '7 dagar' },
  { value: 14, label: '14 dagar' },
  { value: 30, label: '30 dagar' },
  { value: 90, label: '90 dagar' },
];

const ActivityLogs: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    search: '',
    days: 30,
    page: 1,
    limit: 50,
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Hämta loggar
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: () => api.getActivityLogs(filters),
    staleTime: 15000,
  });

  // Hämta statistik
  const { data: statsData } = useQuery({
    queryKey: ['activity-log-stats', filters.days],
    queryFn: () => api.getActivityLogStats(filters.days),
    staleTime: 30000,
  });

  // Rensa gamla loggar
  const cleanupMutation = useMutation({
    mutationFn: () => api.cleanupActivityLogs(90),
    onSuccess: (data) => {
      toast.success(`${data.deleted} gamla loggar raderade`);
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log-stats'] });
    },
    onError: () => toast.error('Kunde inte rensa loggar'),
  });

  const logs: ActivityLog[] = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination;
  const stats: LogStats | null = statsData?.data || null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just nu';
    if (diffMins < 60) return `${diffMins} min sedan`;
    if (diffHours < 24) return `${diffHours}h sedan`;

    return d.toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ShieldCheckIcon className="h-7 w-7" />
              Aktivitetsloggar
            </h1>
            <p className="text-slate-300 mt-1">
              Inloggningar, säkerhetshändelser och systemaktivitet
            </p>
          </div>
          <button
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            {cleanupMutation.isPending ? 'Rensar...' : 'Rensa gamla (90+ dagar)'}
          </button>
        </div>
      </div>

      {/* Statistikkort */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Totala händelser"
            value={stats.totalEvents}
            sub={`Senaste ${filters.days} dagarna`}
            icon={<InformationCircleIcon className="h-5 w-5 text-blue-500" />}
            color="blue"
          />
          <StatCard
            label="Säkerhetshändelser"
            value={stats.securityEvents}
            sub={`${Math.round((stats.securityEvents / Math.max(stats.totalEvents, 1)) * 100)}% av totalt`}
            icon={<ShieldCheckIcon className="h-5 w-5 text-purple-500" />}
            color="purple"
          />
          <StatCard
            label="Misslyckade inloggningar"
            value={stats.failedLogins}
            sub={stats.failedLogins > 10 ? 'Kontrollera!' : 'Normalt'}
            icon={<XCircleIcon className="h-5 w-5 text-red-500" />}
            color="red"
            highlight={stats.failedLogins > 10}
          />
          <StatCard
            label="Lyckade inloggningar"
            value={stats.successfulLogins}
            sub="Unika sessioner"
            icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
            color="green"
          />
        </div>
      )}

      {/* Senaste 24h sammanfattning */}
      {stats?.last24h && stats.last24h.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Senaste 24 timmarna</h3>
          <div className="flex flex-wrap gap-2">
            {stats.last24h.map((item, i) => {
              const severity = getSeverityForType(item.type);
              const config = SEVERITY_CONFIG[severity];
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.badge}`}
                >
                  {item.typeLabel}
                  <span className="font-bold">{item.count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Sökning */}
          <div className="col-span-2 lg:col-span-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sök i loggar..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Kategori */}
          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Nivå */}
          <select
            value={filters.severity}
            onChange={(e) => updateFilter('severity', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {SEVERITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Period */}
          <select
            value={filters.days}
            onChange={(e) => updateFilter('days', parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {DAYS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Återställ */}
          <button
            onClick={() => setFilters({ category: '', severity: '', search: '', days: 30, page: 1, limit: 50 })}
            className="flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Återställ
          </button>
        </div>
      </div>

      {/* Loggtabell */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {logsLoading ? (
          <div className="p-12 text-center text-gray-500">
            <ArrowPathIcon className="h-8 w-8 mx-auto mb-3 animate-spin" />
            <p>Laddar loggar...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Inga loggar hittades</p>
            <p className="text-sm mt-1">Prova att ändra filter eller tidsperiod</p>
          </div>
        ) : (
          <>
            {/* Desktop tabell */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nivå</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Beskrivning</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Användare</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Tid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const config = SEVERITY_CONFIG[log.severity];
                    const SeverityIcon = config.icon;
                    const isExpanded = expandedLog === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${!log.isRead ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                              <SeverityIcon className="h-3.5 w-3.5" />
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{log.typeLabel}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {log.message}
                          </td>
                          <td className="px-4 py-3">
                            {log.user ? (
                              <div>
                                <div className="font-medium text-gray-900 text-xs">{log.user.name}</div>
                                <div className="text-gray-500 text-xs">{log.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">System</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {log.ip || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                            {formatDate(log.createdAt)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-gray-50">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="font-medium text-gray-500">Fullständigt meddelande:</span>
                                  <p className="mt-1 text-gray-700">{log.message}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-500">Händelsetyp:</span>
                                  <p className="mt-1 font-mono text-gray-700">{log.type}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-500">Exakt tid:</span>
                                  <p className="mt-1 text-gray-700">
                                    {new Date(log.createdAt).toLocaleString('sv-SE')}
                                  </p>
                                  {log.project && (
                                    <>
                                      <span className="font-medium text-gray-500 mt-2 block">Projekt:</span>
                                      <p className="mt-1 text-gray-700">{log.project.title}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil-lista */}
            <div className="lg:hidden divide-y divide-gray-100">
              {logs.map((log) => {
                const config = SEVERITY_CONFIG[log.severity];
                const SeverityIcon = config.icon;
                return (
                  <div
                    key={log.id}
                    className={`p-4 ${!log.isRead ? 'bg-blue-50/30' : ''}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <SeverityIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm mt-1">{log.typeLabel}</p>
                        <p className="text-gray-600 text-xs mt-0.5 truncate">{log.message}</p>
                        {log.user && (
                          <p className="text-gray-500 text-xs mt-1">{log.user.name} ({log.user.email})</p>
                        )}
                        {log.ip && (
                          <p className="text-gray-400 text-xs font-mono mt-0.5">IP: {log.ip}</p>
                        )}
                        {expandedLog === log.id && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                            <div>
                              <span className="font-medium text-gray-500">Meddelande:</span>
                              <p className="text-gray-700">{log.message}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Typ:</span>
                              <p className="font-mono text-gray-700">{log.type}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Tid:</span>
                              <p className="text-gray-700">{new Date(log.createdAt).toLocaleString('sv-SE')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginering */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-500">
                  Visar {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} av {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700 font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Hjälpfunktion: bestäm severity från typ
function getSeverityForType(type: string): 'critical' | 'warning' | 'info' | 'success' {
  const criticalTypes = ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY', 'PASSWORD_CHANGE_FAILED', 'PASSWORD_RESET_FAILED', 'EMAIL_CHANGE_FAILED'];
  const warningTypes = ['PASSWORD_RESET_REQUESTED', 'DEADLINE_REMINDER', 'QUOTE_REJECTED'];
  const successTypes = ['LOGIN_SUCCESS', 'PASSWORD_CHANGED', 'PASSWORD_RESET_SUCCESS', 'EMAIL_CHANGED', 'PROJECT_COMPLETED', 'QUOTE_ACCEPTED'];

  if (criticalTypes.includes(type)) return 'critical';
  if (warningTypes.includes(type)) return 'warning';
  if (successTypes.includes(type)) return 'success';
  return 'info';
}

// Statistik-kort komponent
function StatCard({ label, value, sub, icon, color, highlight }: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-200',
    purple: 'border-purple-200',
    red: 'border-red-200',
    green: 'border-green-200',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${highlight ? 'border-red-400 ring-2 ring-red-100' : colorMap[color] || 'border-gray-200'} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('sv-SE')}</p>
      <p className={`text-xs mt-1 ${highlight ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{sub}</p>
    </div>
  );
}

export default ActivityLogs;
