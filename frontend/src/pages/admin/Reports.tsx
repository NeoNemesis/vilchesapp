import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Order } from '../../types';

const AdminReports: React.FC = () => {
  const { data: orders, isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: api.getAllOrders });
  const reported = (orders || []).filter((o: Order) => o.status === 'REPORTED' || o.report);

  if (isLoading) return <div className="p-6">Laddar...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
        <p className="text-sm text-gray-500">Granska inkomna rapporter och skicka till kund</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {reported.map((order: Order) => (
            <li key={order.id} className="px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <Link to={`/admin/orders/${order.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {order.title}
                </Link>
                <p className="text-sm text-gray-500">{order.address}</p>
              </div>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {order.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminReports;

