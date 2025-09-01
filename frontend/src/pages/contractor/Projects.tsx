import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { Order } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const EntrepreneurOrders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Läs URL-parametrar när komponenten laddas
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    
    if (priorityParam === 'urgent') {
      setStatusFilter('urgent'); // Speciell hantering för brådskande
    }
  }, [searchParams]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['entrepreneur-orders'],
    queryFn: api.getMyOrders,
  });

  const filteredOrders = orders?.filter((order: Order) => {
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'urgent') {
      matchesStatus = order.priority === 'URGENT' || order.priority === 'HIGH';
    } else {
      matchesStatus = order.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ASSIGNED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tilldelad' },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pågående' },
      REPORTED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Rapporterad' },
      APPROVED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Godkänd' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ASSIGNED;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'URGENT' || priority === 'HIGH') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {statusFilter === 'ASSIGNED' ? 'Väntar på svar' :
             statusFilter === 'IN_PROGRESS' ? 'Pågående uppdrag' :
             statusFilter === 'REPORTED' ? 'Rapporterade uppdrag' :
             statusFilter === 'APPROVED' ? 'Godkända uppdrag' :
             statusFilter === 'urgent' ? 'Brådskande uppdrag' :
             'Mina uppdrag'}
          </h1>
          {statusFilter !== 'all' && (
            <p className="text-sm text-gray-600 mt-1">
              {statusFilter === 'ASSIGNED' ? 'Projekt som väntar på din bekräftelse' :
               statusFilter === 'IN_PROGRESS' ? 'Projekt du arbetar med just nu' :
               statusFilter === 'REPORTED' ? 'Projekt där du skickat in rapport' :
               statusFilter === 'APPROVED' ? 'Projekt som är godkända och klara' :
               statusFilter === 'urgent' ? 'Projekt med hög eller brådskande prioritet' :
               ''}
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="text-sm text-gray-500">
            {filteredOrders?.length || 0} uppdrag
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Sök uppdrag..."
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla status</option>
              <option value="ASSIGNED">Tilldelade</option>
              <option value="IN_PROGRESS">Pågående</option>
              <option value="REPORTED">Rapporterade</option>
              <option value="APPROVED">Godkända</option>
              <option value="urgent">Brådskande</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid - Mobile Responsive */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrders?.map((order: Order) => (
          <Link
            key={order.id}
            to={`/contractor/projects/${order.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                  {order.title}
                </h3>
              </div>
              <div className="ml-2 flex items-center gap-1">
                {getPriorityIcon(order.priority)}
                {getStatusBadge(order.status)}
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-gray-400" />
                <span className="truncate">{order.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span>{format(new Date(order.createdAt), 'PPP', { locale: sv })}</span>
              </div>
            </div>

            {order.deadline && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-red-600 font-medium">
                  Deadline: {format(new Date(order.deadline), 'PPP', { locale: sv })}
                </span>
              </div>
            )}

            {order.status === 'ASSIGNED' && !order.report && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 w-full justify-center">
                  Väntar på rapport
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {filteredOrders?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {statusFilter === 'ASSIGNED' ? 'Inga projekt väntar på svar' :
             statusFilter === 'IN_PROGRESS' ? 'Inga pågående projekt' :
             statusFilter === 'REPORTED' ? 'Inga rapporterade projekt' :
             statusFilter === 'APPROVED' ? 'Inga godkända projekt' :
             statusFilter === 'urgent' ? 'Inga brådskande projekt' :
             'Inga uppdrag'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Inga uppdrag matchar din sökning' :
             statusFilter === 'ASSIGNED' ? 'Du har inga projekt som väntar på din bekräftelse just nu.' :
             statusFilter === 'IN_PROGRESS' ? 'Du har inga projekt som du arbetar med just nu.' :
             statusFilter === 'REPORTED' ? 'Du har inte skickat in några rapporter än.' :
             statusFilter === 'APPROVED' ? 'Du har inga godkända projekt än.' :
             statusFilter === 'urgent' ? 'Du har inga brådskande projekt just nu.' :
             statusFilter !== 'all' ? 'Inga uppdrag matchar det valda filtret.' :
             'Du har inga tilldelade uppdrag just nu.'}
          </p>
          {statusFilter !== 'all' && !searchTerm && (
            <div className="mt-4">
              <Link
                to="/contractor/projects"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                ← Visa alla uppdrag
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntrepreneurOrders; 