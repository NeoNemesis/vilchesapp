import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  ArrowRightIcon,
  BellIcon,
  XCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Project, TimeReport } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const timeStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const timeStatusLabels: Record<string, string> = {
  DRAFT: 'Utkast',
  SUBMITTED: 'Inskickad',
  APPROVED: 'Godkänd',
  REJECTED: 'Avvisad',
};

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const currentWeek = getWeekNumber(new Date());

  // Projects data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: api.getMyProjects,
  });

  // Time reports data
  const { data: timeReports = [] } = useQuery<TimeReport[]>({
    queryKey: ['my-time-reports', currentYear],
    queryFn: () => api.getMyTimeReports({ year: currentYear }),
  });

  // Mutations
  const acceptProjectMutation = useMutation({
    mutationFn: api.acceptProject,
    onSuccess: () => {
      toast.success('Projekt accepterat!');
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      setActionLoading(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte acceptera projekt');
      setActionLoading(null);
    },
  });

  const rejectProjectMutation = useMutation({
    mutationFn: ({ projectId, reason }: { projectId: string; reason?: string }) =>
      api.rejectProject(projectId, reason),
    onSuccess: () => {
      toast.success('Projekt avvisat.');
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      setActionLoading(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte avvisa projekt');
      setActionLoading(null);
    },
  });

  // Project stats
  const safeProjects = Array.isArray(projects) ? projects : [];
  const assignedProjects = safeProjects.filter((p: Project) => p?.status === 'ASSIGNED');
  const inProgressProjects = safeProjects.filter((p: Project) => p?.status === 'IN_PROGRESS');
  const reportedProjects = safeProjects.filter((p: Project) => p?.status === 'AWAITING_REVIEW');

  // Time report stats
  const thisWeekReport = timeReports.find(r => r.weekNumber === currentWeek && r.year === currentYear);
  const approvedHoursThisYear = timeReports
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.totalHours, 0);
  const pendingTimeReports = timeReports.filter(r => r.status === 'SUBMITTED').length;
  const rejectedTimeReports = timeReports.filter(r => r.status === 'REJECTED');

  const getPriorityBadge = (priority: string) => {
    if (priority === 'URGENT') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Brådskande</span>;
    if (priority === 'HIGH') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Hög</span>;
    return null;
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
      ASSIGNED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tilldelad' },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pågående' },
      AWAITING_REVIEW: { bg: 'bg-green-100', text: 'text-green-800', label: 'Väntar granskning' },
    };
    const c = cfg[status] || cfg.ASSIGNED;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  if (projectsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Välkommen, {user?.name}!</h1>
            <p className="text-blue-100 mt-1">Här är din översikt för vecka {currentWeek}.</p>
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-sm mb-1">Idag</div>
            <div className="text-xl font-semibold">
              {format(new Date(), 'EEEE', { locale: sv })}
            </div>
            <div className="text-lg">
              {format(new Date(), 'd MMMM yyyy', { locale: sv })}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {!thisWeekReport && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">Vecka {currentWeek} saknar tidsrapport</p>
              <p className="text-blue-600 text-sm">Glöm inte att rapportera din arbetstid.</p>
            </div>
          </div>
          <Link to="/employee/time-report" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
            <PlusIcon className="h-4 w-4" />
            Rapportera
          </Link>
        </div>
      )}

      {rejectedTimeReports.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium">{rejectedTimeReports.length} avvisad{rejectedTimeReports.length > 1 ? 'e' : ''} tidsrapport{rejectedTimeReports.length > 1 ? 'er' : ''}</p>
            <p className="text-red-600 text-sm">Behöver åtgärdas och skickas in igen.</p>
          </div>
          <Link to="/employee/time-report" className="ml-auto text-sm text-red-700 font-medium hover:text-red-600">Åtgärda</Link>
        </div>
      )}

      {assignedProjects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <BellIcon className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-yellow-800 font-medium">{assignedProjects.length} projekt väntar på ditt svar</p>
            <p className="text-yellow-600 text-sm">Acceptera eller avböj tilldelade projekt.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pågående projekt</p>
              <p className="text-xl font-bold text-gray-900">{inProgressProjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Timmar denna vecka</p>
              <p className="text-xl font-bold text-gray-900">{thisWeekReport ? thisWeekReport.totalHours.toFixed(0) : '0'}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Godkända timmar i år</p>
              <p className="text-xl font-bold text-gray-900">{approvedHoursThisYear.toFixed(0)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Väntande rapporter</p>
              <p className="text-xl font-bold text-gray-900">{pendingTimeReports + reportedProjects.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Projects */}
        <div className="space-y-6">
          {/* Assigned projects requiring action */}
          {assignedProjects.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Väntar på ditt svar</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {assignedProjects.slice(0, 3).map((project: Project) => (
                  <div key={project.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{project.title}</p>
                          {getPriorityBadge(project.priority)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPinIcon className="h-3 w-3" />{project.address}</span>
                          {project.deadline && <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3" />{format(new Date(project.deadline), 'd MMM', { locale: sv })}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setActionLoading(project.id); acceptProjectMutation.mutate(project.id); }} disabled={actionLoading === project.id} className="px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Acceptera</button>
                        <button onClick={() => { const r = prompt('Anledning (valfritt):'); if (r !== null) { setActionLoading(project.id); rejectProjectMutation.mutate({ projectId: project.id, reason: r.trim() || undefined }); }}} disabled={actionLoading === project.id} className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Avböj</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In-progress projects */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Pågående projekt</h3>
              <Link to="/employee/projects" className="text-xs text-blue-600 hover:text-blue-500 font-medium">Visa alla</Link>
            </div>
            {inProgressProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Inga pågående projekt</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {inProgressProjects.slice(0, 4).map((project: Project) => (
                  <Link key={project.id} to={`/employee/projects/${project.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPinIcon className="h-3 w-3" />{project.address}</span>
                        <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{project.clientName}</span>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Time reports */}
        <div className="space-y-6">
          {/* Current week */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Vecka {currentWeek}</h3>
              <Link to="/employee/time-report" className="text-xs text-blue-600 hover:text-blue-500 font-medium">
                {thisWeekReport ? 'Visa' : 'Skapa'}
              </Link>
            </div>
            <div className="p-5">
              {thisWeekReport ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${timeStatusColors[thisWeekReport.status]}`}>
                      {timeStatusLabels[thisWeekReport.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Totalt</span>
                    <span className="text-lg font-bold text-gray-900">{thisWeekReport.totalHours.toFixed(1)}h</span>
                  </div>
                  {thisWeekReport.entries && thisWeekReport.entries.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-1.5">
                      {thisWeekReport.entries.map((e, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600">{e.activityName}</span>
                          <span className="text-gray-900 font-medium">{e.totalHours.toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <ClockIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Ingen rapport skapad ännu</p>
                  <Link to="/employee/time-report" className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-500 font-medium">
                    <PlusIcon className="h-4 w-4" />
                    Skapa tidsrapport
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent time reports */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Senaste tidsrapporter</h3>
              <Link to="/employee/time-report" className="text-xs text-blue-600 hover:text-blue-500 font-medium">Visa alla</Link>
            </div>
            {timeReports.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Inga tidsrapporter ännu</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {timeReports.slice(0, 5).map(report => (
                  <div key={report.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">v{report.weekNumber}, {report.year}</p>
                      <p className="text-xs text-gray-500">{report.totalHours.toFixed(1)} timmar</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${timeStatusColors[report.status]}`}>
                      {timeStatusLabels[report.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Snabblänkar</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/employee/time-report" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
            <ClockIcon className="h-6 w-6 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Tidsrapport</span>
          </Link>
          <Link to="/employee/projects" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
            <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
            <span className="text-xs font-medium text-green-700">Mina projekt</span>
          </Link>
          <Link to="/employee/calendar" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
            <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Kalender</span>
          </Link>
          <Link to="/employee/map" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
            <MapPinIcon className="h-6 w-6 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Karta</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
