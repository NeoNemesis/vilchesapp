import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeftIcon, 
  CheckIcon, 
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface ReportMaterial {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface Report {
  id: string;
  title: string;
  workDescription: string;
  hoursWorked: number;
  progressPercent: number;
  nextSteps?: string;
  issues?: string;
  materialsUsed: ReportMaterial[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    title: string;
    clientName: string;
    clientEmail: string;
    address: string;
  };
  images: Array<{
    id: string;
    url: string;
    description?: string;
    originalName: string;
  }>;
}

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [sendToClient, setSendToClient] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.getReport(id!),
    enabled: !!id
  });

  const approveMutation = useMutation({
    mutationFn: ({ reportId, sendToClient }: { reportId: string; sendToClient: boolean }) =>
      api.approveReport(reportId, sendToClient),
    onSuccess: () => {
      toast.success(sendToClient ? 'Rapport godkänd och skickad till kund!' : 'Rapport godkänd!');
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setShowApprovalModal(false);
      navigate(-1);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fel vid godkännande av rapport');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reportId: string) => api.rejectReport(reportId),
    onSuccess: () => {
      toast.success('Rapport avvisad');
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      navigate(-1);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fel vid avvisning av rapport');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Rapport hittades inte</h2>
          <p className="text-gray-600 mb-4">Rapporten du letar efter existerar inte eller har tagits bort.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Gå tillbaka
          </button>
        </div>
      </div>
    );
  }

  const totalMaterialCost = Array.isArray(report.materialsUsed) ? 
    report.materialsUsed.reduce((sum: number, material: any) => sum + (material.quantity * material.unitPrice), 0) : 0;

  const handleApprove = () => {
    approveMutation.mutate({ reportId: report.id, sendToClient });
  };

  const handleReject = () => {
    if (confirm('Är du säker på att du vill avvisa denna rapport?')) {
      rejectMutation.mutate(report.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Tillbaka
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{report.title}</h1>
              <p className="text-gray-600 mt-1">Rapport för projekt: {report.project.title}</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                report.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                report.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                report.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {report.status === 'APPROVED' ? 'Godkänd' :
                 report.status === 'REJECTED' ? 'Avvisad' :
                 report.status === 'SUBMITTED' ? 'Inlämnad' : 'Utkast'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Work Description */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Arbetsbeskrivning</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{report.workDescription}</p>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Framsteg</h2>
              <div className="flex items-center mb-2">
                <span className="text-2xl font-bold text-blue-600">{report.progressPercent}%</span>
                <span className="text-gray-600 ml-2">färdigt</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${report.progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Materials */}
            {Array.isArray(report.materialsUsed) && report.materialsUsed.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Använda material</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Antal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enhet</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pris/enhet</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totalt</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.materialsUsed.map((material: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.unitPrice.toLocaleString()} kr</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {(material.quantity * material.unitPrice).toLocaleString()} kr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          Total materialkostnad:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {totalMaterialCost.toLocaleString()} kr
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {report.nextSteps && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Nästa steg</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{report.nextSteps}</p>
              </div>
            )}

            {/* Issues */}
            {report.issues && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  Problem/Utmaningar
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{report.issues}</p>
              </div>
            )}

            {/* Images */}
            {report.images && report.images.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Bilder ({report.images.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                  {report.images.map((image: any) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={image.description || image.originalName}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(image.url, '_blank')}
                      />
                      {image.description && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{image.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Report Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapportinfo</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.author.name}</p>
                    <p className="text-xs text-gray-600">{report.author.email}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.hoursWorked} timmar</p>
                    <p className="text-xs text-gray-600">Arbetade timmar</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(report.createdAt), 'd MMM yyyy', { locale: sv })}
                    </p>
                    <p className="text-xs text-gray-600">Skapad</p>
                  </div>
                </div>

                {report.updatedAt !== report.createdAt && (
                  <div className="flex items-center">
                    <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(report.updatedAt), 'd MMM yyyy', { locale: sv })}
                      </p>
                      <p className="text-xs text-gray-600">Uppdaterad</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Project Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projektinfo</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.project.title}</p>
                  <p className="text-xs text-gray-600">Projektnamn</p>
                </div>

                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.project.clientName}</p>
                    <p className="text-xs text-gray-600">Kund</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-900">{report.project.address}</p>
                  <p className="text-xs text-gray-600">Adress</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            {report.status === 'SUBMITTED' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Åtgärder</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Godkänn rapport
                  </button>
                  
                  <button
                    onClick={handleReject}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Avvisa rapport
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Godkänn rapport</h3>
            
            <p className="text-gray-600 mb-4">
              När du godkänner rapporten kommer projektet att markeras som avslutat.
            </p>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendToClient}
                  onChange={(e) => setSendToClient(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Skicka rapport till kund via e-post
                </span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Godkänner...' : 'Godkänn'}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
