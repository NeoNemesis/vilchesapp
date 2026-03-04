import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  DocumentTextIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  CalendarDaysIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';

interface Report {
  id: string;
  title: string;
  workDescription: string;
  hoursWorked: number;
  progressPercent: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    title: string;
    address: string;
    clientName: string;
  };
  author?: {
    id: string;
    name: string;
    email: string;
  };
  images?: {
    id: string;
    filename: string;
    originalName: string;
  }[];
}

const AdminReports: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: api.getAllProjects
  });

  // Extrahera alla rapporter från projekten
  const allReports: Report[] = (projects || [])
    .flatMap((project: any) =>
      (project.reports || []).map((report: any) => ({
        ...report,
        project: {
          id: project.id,
          title: project.title,
          address: project.address,
          clientName: project.clientName
        }
      }))
    )
    .sort((a: Report, b: Report) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filteredReports = allReports.filter((report: Report) => {
    switch (statusFilter) {
      case 'submitted':
        return report.status === 'SUBMITTED';
      case 'approved':
        return report.status === 'APPROVED';
      case 'rejected':
        return report.status === 'REJECTED';
      case 'draft':
        return report.status === 'DRAFT';
      default:
        return true;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'DRAFT':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'Inskickad';
      case 'APPROVED':
        return 'Godkänd';
      case 'REJECTED':
        return 'Avvisad';
      case 'DRAFT':
        return 'Utkast';
      default:
        return status;
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
                <p className="text-gray-600">Granska inkomna rapporter från underleverantörer</p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-3">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Alla rapporter</option>
                <option value="submitted">Inskickade</option>
                <option value="approved">Godkända</option>
                <option value="rejected">Avvisade</option>
                <option value="draft">Utkast</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Väntar granskning</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allReports.filter(r => r.status === 'SUBMITTED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Godkända</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allReports.filter(r => r.status === 'APPROVED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-gray-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Totalt rapporter</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allReports.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Genomsnittlig tid</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allReports.length > 0
                  ? Math.round(allReports.reduce((sum, r) => sum + r.hoursWorked, 0) / allReports.length * 10) / 10
                  : 0
                }h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga rapporter</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter === 'all'
                ? 'Det finns inga rapporter att visa.'
                : `Det finns inga rapporter med status "${getStatusText(statusFilter)}".`
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredReports.map((report: Report) => (
              <li key={report.id} className="hover:bg-gray-50">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 min-w-0 flex-1">
                      <div className="flex-shrink-0 pt-1">
                        {getStatusIcon(report.status)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <Link
                            to={`/admin/reports/${report.id}`}
                            className="text-lg font-medium text-blue-600 hover:text-blue-800 truncate"
                          >
                            {report.title}
                          </Link>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {getStatusText(report.status)}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Projekt:</span>
                            <Link
                              to={`/admin/projects/${report.project.id}`}
                              className="ml-2 text-blue-600 hover:text-blue-800 truncate"
                            >
                              {report.project.title}
                            </Link>
                          </div>

                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center space-x-1">
                              <MapPinIcon className="h-4 w-4" />
                              <span className="truncate">{report.project.address}</span>
                            </div>
                            {report.author && (
                              <div className="flex items-center space-x-1">
                                <UserIcon className="h-4 w-4" />
                                <span className="truncate">{report.author.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-4 w-4" />
                              <span>{report.hoursWorked}h arbetad tid</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CalendarDaysIcon className="h-4 w-4" />
                              <span>
                                {format(new Date(report.createdAt), 'dd MMM yyyy HH:mm', { locale: sv })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {report.workDescription}
                          </p>
                        </div>

                        {report.images && report.images.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">
                              📎 {report.images.length} bifogade bilder
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {report.progressPercent}%
                        </div>
                        <div className="text-sm text-gray-500">Färdigställt</div>
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/reports/${report.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Visa
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminReports;