import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface Project {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  address: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  estimatedHours?: number;
  estimatedCost?: number; // Ändrat från budget
  deadline?: string;
  assignedToId?: string; // Ändrat från contractorId
  assignedTo?: { // Ändrat från contractor
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  createdAt: string;
}

interface Contractor {
  id: string;
  name: string;
  email: string;
  company?: string;
  isActive: boolean;
}

const ProjectModal: React.FC<{
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  contractors: Contractor[];
}> = ({ project, isOpen, onClose, onSubmit, contractors }) => {
  const [formData, setFormData] = useState({
    title: project?.title || '',
    description: project?.description || '',
    clientName: project?.clientName || '',
    clientEmail: project?.clientEmail || '',
    clientPhone: project?.clientPhone || '',
    address: project?.address || '',
    priority: project?.priority || 'NORMAL',
    estimatedHours: project?.estimatedHours || '',
    budget: project?.budget || '',
    deadline: project?.deadline ? project.deadline.split('T')[0] : '',
    contractorId: project?.contractorId || '',
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Uppdatera formData när project ändras
  React.useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        clientName: project.clientName || '',
        clientEmail: project.clientEmail || '',
        clientPhone: project.clientPhone || '',
        address: project.address || '',
        priority: project.priority || 'NORMAL',
        estimatedHours: project.estimatedHours || '',
        budget: project.estimatedCost || '',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        contractorId: project.assignedToId || '',
      });
    } else {
      // Reset för nytt projekt
      setFormData({
        title: '',
        description: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        address: '',
        priority: 'NORMAL',
        estimatedHours: '',
        budget: '',
        deadline: '',
        contractorId: '',
      });
    }
  }, [project]);

  // Reset bilder när modalen öppnas/stängs
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedImages([]);
      setImagePreviews([]);
    }
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Begränsa till max 5 bilder
    const maxImages = 5;
    const totalImages = selectedImages.length + files.length;
    
    if (totalImages > maxImages) {
      toast.error(`Du kan bara ladda upp max ${maxImages} bilder`);
      return;
    }

    // Kontrollera filstorlek (max 5MB per bild)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast.error('Vissa bilder är för stora. Max storlek är 5MB per bild.');
      return;
    }

    // Lägg till nya bilder
    setSelectedImages(prev => [...prev, ...files]);

    // Skapa previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours.toString()) : undefined,
      estimatedCost: formData.budget ? parseFloat(formData.budget.toString()) : undefined, // Ändrat från budget
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      assignedToId: formData.contractorId || undefined, // Ändrat från contractorId
      images: selectedImages, // Lägg till bilder
    };
    
    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white">
              {project ? 'Redigera Projekt' : 'Nytt Projekt'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projekttitel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="t.ex. Badrumsrenovering Vasastan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beskrivning *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Beskriv vad som ska göras..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kundens namn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="kund@exempel.se"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="070-123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adress *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Gatuadress, Stad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioritet
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Låg</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Hög</option>
                  <option value="URGENT">Brådskande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (SEK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="t.ex. 25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tilldela till
                </label>
                <select
                  value={formData.contractorId}
                  onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Välj entreprenör --</option>
                  {contractors.filter(c => c.isActive).map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} {contractor.company ? `(${contractor.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bilduppladdning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bilder (valfritt)
              </label>
              
              <div className="space-y-4">
                {/* Upload knapp */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klicka för att ladda upp</span> eller dra och släpp
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG (max 5MB, max 5 bilder)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </label>
                </div>

                {/* Bildpreviews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                {project ? 'Uppdatera' : 'Skapa Projekt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminProjects: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const queryClient = useQueryClient();

  // Hämta data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getAllProjects
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: api.getContractors
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      toast.success('Projekt skapat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa projekt');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      setEditingProject(undefined);
      toast.success('Projekt uppdaterat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera projekt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt borttaget!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort projekt');
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ projectId, contractorId }: { projectId: string; contractorId: string }) =>
      api.assignProject(projectId, contractorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt tilldelat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte tilldela projekt');
    }
  });

  // Event handlers
  const handleSubmit = (data: any) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(undefined);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = (project: Project) => {
    if (confirm(`Är du säker på att du vill ta bort projektet "${project.title}"?`)) {
      deleteMutation.mutate(project.id);
    }
  };

  const handleAssign = (project: Project) => {
    const contractorId = prompt(`Tilldela projekt "${project.title}" till entreprenör (ID):`);
    if (contractorId && contractorId.trim()) {
      assignMutation.mutate({ projectId: project.id, contractorId: contractorId.trim() });
    }
  };

  const handleQuickAssign = (project: Project, contractorId: string) => {
    assignMutation.mutate({ projectId: project.id, contractorId });
  };

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    if (filterStatus === 'all') return true;
    return project.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Väntar';
      case 'ASSIGNED': return 'Tilldelad';
      case 'IN_PROGRESS': return 'Pågående';
      case 'COMPLETED': return 'Klar';
      default: return status;
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
          <h1 className="text-2xl font-bold text-gray-900">Projekt</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hantera alla projekt och kundförfrågningar
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          Nytt Projekt
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'all' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Alla ({projects.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Otilldelade ({projects.filter((p: Project) => p.status === 'PENDING').length})
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga projekt</h3>
            <p className="mt-1 text-sm text-gray-500">Kom igång genom att skapa ditt första projekt.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProjects.map((project: Project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{project.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        {project.clientName}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        {project.address}
                      </div>
                    </div>

                    {project.assignedTo && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                          <UserIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            {project.assignedTo.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {project.status === 'PENDING' && (
                      <div className="relative group">
                        <button
                          onClick={() => handleAssign(project)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Tilldela projekt"
                        >
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Quick assign dropdown */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="p-2">
                            <p className="text-xs text-gray-500 mb-2">Snabbtilldela till:</p>
                            {contractors.filter(c => c.isActive).slice(0, 3).map((contractor) => (
                              <button
                                key={contractor.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAssign(project, contractor.id);
                                }}
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                {contractor.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Redigera projekt"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(project)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Ta bort projekt"
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

      {/* Modal */}
      <ProjectModal
        project={editingProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        contractors={contractors}
      />
    </div>
  );
};

export default AdminProjects;
