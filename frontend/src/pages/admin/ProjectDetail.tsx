import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => api.getOrderDetail(id!) });
  const approveMutation = useMutation({
    mutationFn: (clientEmail: string) => api.approveReport(id!, clientEmail),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  });

  if (isLoading) return <div className="p-6">Laddar...</div>;
  if (!order) return <div className="p-6">Hittade inte order</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
      <p>{order.description}</p>
      {order.report && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Inskickad rapport</h2>
          <p>{order.report.actionTaken}</p>
          <button
            onClick={() => {
              const email = prompt('Ange kundens e-post för att skicka rapport');
              if (email) approveMutation.mutate(email);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Godkänn och skicka till kund
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetail;

