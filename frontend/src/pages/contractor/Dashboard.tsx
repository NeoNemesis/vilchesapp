import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  ArrowRightIcon,
  BellIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Project } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: api.getMyProjects,
  });

  // Mutation för att acceptera projekt
  const acceptProjectMutation = useMutation({
    mutationFn: api.acceptProject,
    onSuccess: (data) => {
      toast.success('Projekt accepterat! Nu kan du börja arbeta.');
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      setActionLoading(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte acceptera projekt');
      setActionLoading(null);
    },
  });

  // Mutation för att avböja projekt
  const rejectProjectMutation = useMutation({
    mutationFn: ({ projectId, reason }: { projectId: string; reason?: string }) => 
      api.rejectProject(projectId, reason),
    onSuccess: (data) => {
      toast.success('Projekt avvisat. Admin får en notifikation.');
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      setActionLoading(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte avvisa projekt');
      setActionLoading(null);
    },
  });

  // Filtrera projekt baserat på status - säker filtrering
  const safeProjects = Array.isArray(projects) ? projects : [];
  const assignedProjects = safeProjects.filter((p: Project) => p?.status === 'ASSIGNED');
  const inProgressProjects = safeProjects.filter((p: Project) => p?.status === 'IN_PROGRESS');
  const reportedProjects = safeProjects.filter((p: Project) => p?.status === 'AWAITING_REVIEW');
  const urgentProjects = safeProjects.filter((p: Project) => p?.priority === 'URGENT' || p?.priority === 'HIGH');

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ASSIGNED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tilldelad', icon: BellIcon },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pågående', icon: ClockIcon },
      AWAITING_REVIEW: { bg: 'bg-green-100', text: 'text-green-800', label: 'Väntar granskning', icon: CheckCircleIcon },
      APPROVED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Godkänd', icon: CheckCircleIcon },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ASSIGNED;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'URGENT') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🚨 Brådskande</span>;
    }
    if (priority === 'HIGH') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">⚠️ Hög</span>;
    }
    return null;
  };

  const acceptProject = async (projectId: string) => {
    setActionLoading(projectId);
    acceptProjectMutation.mutate(projectId);
  };

  const rejectProject = async (projectId: string) => {
    const reason = prompt('Anledning för avvisning (valfritt):');
    if (reason !== null) { // Användaren klickade inte Cancel
      setActionLoading(projectId);
      rejectProjectMutation.mutate({ projectId, reason: reason.trim() || undefined });
    }
  };

  if (isLoading) {
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
            <p className="text-blue-100 mt-1">Här är en översikt över dina projekt och uppdrag.</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tilldelade projekt */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BellIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Väntar på svar</dt>
                  <dd className="text-lg font-medium text-gray-900">{assignedProjects.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/contractor/projects?status=ASSIGNED" className="font-medium text-yellow-700 hover:text-yellow-600">
                Se alla tilldelade →
              </Link>
            </div>
          </div>
        </div>

        {/* Pågående projekt */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pågående arbeten</dt>
                  <dd className="text-lg font-medium text-gray-900">{inProgressProjects.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/contractor/projects?status=IN_PROGRESS" className="font-medium text-blue-700 hover:text-blue-600">
                Se pågående →
              </Link>
            </div>
          </div>
        </div>

        {/* Rapporterade projekt */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inlämnade rapporter</dt>
                  <dd className="text-lg font-medium text-gray-900">{reportedProjects.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-green-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/contractor/projects?status=AWAITING_REVIEW" className="font-medium text-green-700 hover:text-green-600">
                Se rapporter →
              </Link>
            </div>
          </div>
        </div>

        {/* Brådskande projekt */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Brådskande</dt>
                  <dd className="text-lg font-medium text-gray-900">{urgentProjects.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-red-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/contractor/projects?priority=urgent" className="font-medium text-red-700 hover:text-red-600">
                Se brådskande →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tilldelade projekt som väntar på svar */}
      {assignedProjects.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              🔔 Projekt som väntar på ditt svar
            </h3>
            <div className="space-y-4">
              {assignedProjects.slice(0, 3).map((project: Project) => (
                <div key={project.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">{project.title}</h4>
                        {getPriorityBadge(project.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{project.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" />
                          {project.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {project.clientName}
                        </span>
                        {project.deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-3 w-3" />
                            {format(new Date(project.deadline), 'PPP', { locale: sv })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => acceptProject(project.id)}
                        disabled={actionLoading === project.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === project.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        Acceptera
                      </button>
                      <button
                        onClick={() => rejectProject(project.id)}
                        disabled={actionLoading === project.id}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === project.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-1"></div>
                        ) : (
                          <XCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        Avböj
                      </button>
                      <Link
                        to={`/contractor/projects/${project.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Se detaljer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {assignedProjects.length > 3 && (
                <div className="text-center">
                  <Link
                    to="/contractor/projects?status=ASSIGNED"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Se alla {assignedProjects.length} tilldelade projekt →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pågående projekt */}
      {inProgressProjects.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              🔧 Pågående projekt
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inProgressProjects.slice(0, 4).map((project: Project) => (
                <div key={project.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{project.title}</h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">{project.address}</p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(project.status)}
                        <Link
                          to={`/contractor/projects/${project.id}/report`}
                          className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                        >
                          Uppdatera →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {inProgressProjects.length > 4 && (
              <div className="text-center mt-4">
                <Link
                  to="/contractor/projects?status=IN_PROGRESS"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Se alla {inProgressProjects.length} pågående projekt →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            ⚡ Snabba åtgärder
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/contractor/projects"
              className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-600 text-white">
                  <ClipboardDocumentListIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Alla mina projekt
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Se alla tilldelade projekt och deras status
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowRightIcon className="h-6 w-6" />
              </span>
            </Link>

            <Link
              to="/contractor/projects?status=ASSIGNED"
              className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-yellow-500 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-600 text-white">
                  <BellIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Väntar på svar
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Projekt som behöver accepteras eller avböjas
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowRightIcon className="h-6 w-6" />
              </span>
            </Link>

            <Link
              to="/contractor/projects?status=IN_PROGRESS"
              className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-600 text-white">
                  <DocumentTextIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Skicka rapport
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Uppdatera progress på pågående projekt
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowRightIcon className="h-6 w-6" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Inga projekt än</h3>
          <p className="mt-1 text-sm text-gray-500">
            Du har inga tilldelade projekt just nu. De kommer att visas här när du får nya uppdrag.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContractorDashboard;

