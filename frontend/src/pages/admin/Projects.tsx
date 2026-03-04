import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Project, Contractor } from '../../types';
import { ProjectModal } from '../../components/ProjectModal';


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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      toast.success('Projekt tilldelat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte tilldela projekt');
    }
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }) =>
      api.updateProject(projectId, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      const statusLabels: Record<string, string> = {
        'PENDING': 'Väntar',
        'ASSIGNED': 'Tilldelad',
        'IN_PROGRESS': 'Pågående',
        'COMPLETED': 'Färdig',
        'CANCELLED': 'Avbruten'
      };
      toast.success(`Status ändrad till "${statusLabels[status]}"!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ändra status');
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
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Väntar';
      case 'ASSIGNED': return 'Tilldelad';
      case 'IN_PROGRESS': return 'Pågående';
      case 'COMPLETED': return 'Färdig';
      case 'CANCELLED': return 'Avbruten';
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
          <button
            onClick={() => setFilterStatus('ASSIGNED')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'ASSIGNED' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tilldelade ({projects.filter((p: Project) => p.status === 'ASSIGNED').length})
          </button>
          <button
            onClick={() => setFilterStatus('IN_PROGRESS')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'IN_PROGRESS' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pågående ({projects.filter((p: Project) => p.status === 'IN_PROGRESS').length})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'COMPLETED' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Färdiga ({projects.filter((p: Project) => p.status === 'COMPLETED').length})
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
                  <Link 
                    to={`/admin/projects/${project.id}`}
                    className="flex-1 min-w-0 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {project.title}
                        {project.status === 'COMPLETED' && (
                          <CheckCircleIcon className="inline-block h-5 w-5 text-green-600 ml-2" />
                        )}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  </Link>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Visa detaljer"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>

                    {/* Quick status change dropdown */}
                    <div className="relative group">
                      <button
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Ändra status"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </button>

                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="py-1">
                          <p className="text-xs text-gray-500 px-3 py-1">Ändra status:</p>
                          {project.status !== 'IN_PROGRESS' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                changeStatusMutation.mutate({ projectId: project.id, status: 'IN_PROGRESS' });
                              }}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-700"
                            >
                              ▶ Pågående
                            </button>
                          )}
                          {project.status !== 'COMPLETED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Markera som färdig?')) {
                                  changeStatusMutation.mutate({ projectId: project.id, status: 'COMPLETED' });
                                }
                              }}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              ✓ Färdig
                            </button>
                          )}
                          {project.status !== 'CANCELLED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Avbryta projektet?')) {
                                  changeStatusMutation.mutate({ projectId: project.id, status: 'CANCELLED' });
                                }
                              }}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                            >
                              ✕ Avbruten
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

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
                            {contractors.filter((c: any) => c.isActive).slice(0, 3).map((contractor: any) => (
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
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};

export default AdminProjects;
