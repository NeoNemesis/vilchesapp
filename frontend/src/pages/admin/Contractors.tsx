import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface Contractor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  isActive: boolean;
  createdAt: string;
}

const ContractorModal: React.FC<{
  contractor?: Contractor;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Contractor>) => void;
}> = ({ contractor, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: contractor?.name || '',
    email: contractor?.email || '',
    phone: contractor?.phone || '',
    company: contractor?.company || '',
    isActive: contractor?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white">
              {contractor ? 'Redigera Entreprenör' : 'Ny Entreprenör'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Namn *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Förnamn Efternamn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-post *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="namn@exempel.se"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="070-123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Företag
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Företagsnamn AB"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Aktiv entreprenör
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                {contractor ? 'Uppdatera' : 'Skapa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminContractors: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | undefined>();
  const queryClient = useQueryClient();

  // Hämta entreprenörer från API
  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: api.getContractors
  });

  const createMutation = useMutation({
    mutationFn: api.createContractor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setIsModalOpen(false);
      toast.success('Entreprenör skapad!');
      
      // Visa temporärt lösenord om det finns
      if (data.tempPassword) {
        toast.success(`Temporärt lösenord: ${data.tempPassword}`, { duration: 10000 });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa entreprenör');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Contractor> }) => 
      api.updateContractor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setIsModalOpen(false);
      setEditingContractor(undefined);
      toast.success('Entreprenör uppdaterad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera entreprenör');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteContractor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Entreprenör borttagen!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort entreprenör');
    }
  });

  const welcomeEmailMutation = useMutation({
    mutationFn: api.sendWelcomeEmail,
    onSuccess: (data) => {
      toast.success(`Välkomstmail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka välkomstmail');
    }
  });

  const passwordResetMutation = useMutation({
    mutationFn: api.sendPasswordResetEmail,
    onSuccess: (data) => {
      toast.success(`Lösenordsbyte-mail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka lösenordsbyte-mail');
    }
  });

  const handleSubmit = (data: Partial<Contractor>) => {
    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data });
    } else {
      // Ensure required fields are present
      if (data.name && data.email) {
        createMutation.mutate(data as { name: string; email: string; phone?: string; company?: string; isActive?: boolean });
      }
    }
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setIsModalOpen(true);
  };

  const handleDelete = (contractor: Contractor) => {
    if (confirm(`Är du säker på att du vill ta bort ${contractor.name}?`)) {
      deleteMutation.mutate(contractor.id);
    }
  };

  const handleSendWelcomeEmail = (contractor: Contractor) => {
    if (confirm(`Skicka välkomstmail till ${contractor.name} (${contractor.email})?`)) {
      welcomeEmailMutation.mutate(contractor.id);
    }
  };

  const handleSendPasswordReset = (contractor: Contractor) => {
    if (confirm(`Skicka lösenordsbyte-mail till ${contractor.name} (${contractor.email})?`)) {
      passwordResetMutation.mutate(contractor.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Underleverantörer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hantera dina entreprenörer och deras profiler
          </p>
        </div>
        <button
          onClick={() => {
            setEditingContractor(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          Ny Entreprenör
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCircleIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Totalt</p>
              <p className="text-2xl font-semibold text-gray-900">{contractors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Aktiva</p>
              <p className="text-2xl font-semibold text-gray-900">
                {contractors.filter((c: Contractor) => c.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inaktiva</p>
              <p className="text-2xl font-semibold text-gray-900">
                {contractors.filter((c: Contractor) => !c.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contractors List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Alla Entreprenörer</h3>
        </div>
        
        <div className="overflow-hidden">
          {contractors.length === 0 ? (
            <div className="text-center py-12">
              <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Inga entreprenörer</h3>
              <p className="mt-1 text-sm text-gray-500">Kom igång genom att lägga till din första entreprenör.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contractors.map((contractor: Contractor) => (
                <div key={contractor.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {contractor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900 truncate">
                            {contractor.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            contractor.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {contractor.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <EnvelopeIcon className="h-4 w-4" />
                            {contractor.email}
                          </div>
                          {contractor.phone && (
                            <div className="flex items-center gap-1">
                              <PhoneIcon className="h-4 w-4" />
                              {contractor.phone}
                            </div>
                          )}
                          {contractor.company && (
                            <div className="flex items-center gap-1">
                              <BuildingOfficeIcon className="h-4 w-4" />
                              {contractor.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendWelcomeEmail(contractor)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Skicka välkomstmail"
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleSendPasswordReset(contractor)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Skicka lösenordsbyte-mail"
                      >
                        <KeyIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(contractor)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Redigera"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(contractor)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Ta bort"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <ContractorModal
        contractor={editingContractor}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContractor(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AdminContractors;
