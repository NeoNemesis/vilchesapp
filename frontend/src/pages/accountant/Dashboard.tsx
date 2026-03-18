import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AccountantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['accountant-summary'],
    queryFn: () => api.getTimeReportSummary(),
  });

  const { data: reports } = useQuery({
    queryKey: ['accountant-reports', { status: 'APPROVED' }],
    queryFn: () => api.getAdminTimeReports({ status: 'APPROVED' }),
  });

  const approvedReports = reports || [];
  const totalHours = approvedReports.reduce((sum: number, r: any) => sum + (r.totalHours || 0), 0);
  const uniqueEmployees = new Set(approvedReports.map((r: any) => r.userId)).size;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Revisor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Välkommen, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-emerald-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Godkända rapporter</p>
              <p className="text-2xl font-bold text-gray-900">{approvedReports.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Totala timmar</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Anställda</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Väntande</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.pending || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => navigate('/accountant/time-reports')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <ClockIcon className="h-8 w-8 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900">Tidsrapporter</h3>
          <p className="text-sm text-gray-500 mt-1">Granska godkända tidsrapporter, ladda ner PDF och CSV</p>
        </button>
        <button
          onClick={() => navigate('/accountant/employees')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <UserGroupIcon className="h-8 w-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900">Anställda</h3>
          <p className="text-sm text-gray-500 mt-1">Se personalinformation, timlöner och bankkonton</p>
        </button>
        <button
          onClick={() => navigate('/accountant/export')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <DocumentArrowDownIcon className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900">Exportera</h3>
          <p className="text-sm text-gray-500 mt-1">Ladda ner samlad data per månad som PDF eller CSV</p>
        </button>
      </div>

      {/* Recent approved reports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Senaste godkända rapporter</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {approvedReports.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Inga godkända rapporter att visa
            </div>
          ) : (
            approvedReports.slice(0, 10).map((report: any) => (
              <div key={report.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.user?.name || 'Okänd'}</p>
                  <p className="text-xs text-gray-500">Vecka {report.weekNumber}, {report.year}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-900">{report.totalHours}h</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Godkänd
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
