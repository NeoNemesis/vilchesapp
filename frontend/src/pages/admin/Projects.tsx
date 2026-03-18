import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Project, Contractor } from '../../types';
import { ProjectModal } from '../../components/ProjectModal';

// 3-dot action menu for mobile
const ProjectActionMenu: React.FC<{
  project: Project;
  contractors: Contractor[];
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onQuickAssign: (contractorId: string) => void;
  onChangeStatus: (status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => void;
}> = ({ project, contractors, onEdit, onDelete, onAssign, onQuickAssign, onChangeStatus }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
          <Link
            to={`/admin/projects/${project.id}`}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <EyeIcon className="h-4 w-4 text-blue-500" /> Visa detaljer
          </Link>
          {project.status !== 'IN_PROGRESS' && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChangeStatus('IN_PROGRESS'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4 text-green-500" /> Pågående
            </button>
          )}
          {project.status !== 'COMPLETED' && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChangeStatus('COMPLETED'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500" /> Markera färdig
            </button>
          )}
          {project.status === 'PENDING' && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <p className="px-4 py-1 text-xs text-gray-400">Tilldela till:</p>
              {contractors.filter((c: any) => c.isActive).slice(0, 3).map((contractor: any) => (
                <button
                  key={contractor.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickAssign(contractor.id); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <UserPlusIcon className="h-4 w-4 text-green-500" /> {contractor.name}
                </button>
              ))}
            </>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <PencilIcon className="h-4 w-4 text-blue-500" /> Redigera
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
            <TrashIcon className="h-4 w-4" /> Ta bort
          </button>
        </div>
      )}
    </div>
  );
};


const AdminProjects: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getAllProjects
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: api.getContractors
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
    queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
  };

  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => { invalidateAll(); setIsModalOpen(false); toast.success('Projekt skapat!'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Kunde inte skapa projekt'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.updateProject(id, data),
    onSuccess: () => { invalidateAll(); setIsModalOpen(false); setEditingProject(undefined); toast.success('Projekt uppdaterat!'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Kunde inte uppdatera projekt'); }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => { invalidateAll(); toast.success('Projekt borttaget!'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Kunde inte ta bort projekt'); }
  });

  const assignMutation = useMutation({
    mutationFn: ({ projectId, contractorId }: { projectId: string; contractorId: string }) =>
      api.assignProject(projectId, contractorId),
    onSuccess: () => { invalidateAll(); toast.success('Projekt tilldelat!'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Kunde inte tilldela projekt'); }
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }) =>
      api.updateProject(projectId, { status }),
    onSuccess: (_, { status }) => {
      invalidateAll();
      const statusLabels: Record<string, string> = { 'PENDING': 'Väntar', 'ASSIGNED': 'Tilldelad', 'IN_PROGRESS': 'Pågående', 'COMPLETED': 'Färdig', 'CANCELLED': 'Avbruten' };
      toast.success(`Status ändrad till "${statusLabels[status]}"!`);
    },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Kunde inte ändra status'); }
  });

  const handleSubmit = (data: any) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
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
      <div className="mb-4 sm:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Projekt</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Hantera projekt och kundförfrågningar
          </p>
        </div>
        <button
          onClick={() => { setEditingProject(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm sm:text-base"
        >
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Nytt Projekt</span>
          <span className="sm:hidden">Nytt</span>
        </button>
      </div>

      {/* Filters - scrollable on mobile */}
      <div className="mb-4 sm:mb-6">
        <div className="flex gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-hide pb-1">
          {[
            { key: 'all', label: 'Alla', count: projects.length },
            { key: 'PENDING', label: 'Otilldelade', count: projects.filter((p: Project) => p.status === 'PENDING').length },
            { key: 'ASSIGNED', label: 'Tilldelade', count: projects.filter((p: Project) => p.status === 'ASSIGNED').length },
            { key: 'IN_PROGRESS', label: 'Pågående', count: projects.filter((p: Project) => p.status === 'IN_PROGRESS').length },
            { key: 'COMPLETED', label: 'Färdiga', count: projects.filter((p: Project) => p.status === 'COMPLETED').length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filterStatus === key
                  ? key === 'all' ? 'bg-blue-100 text-blue-800'
                    : key === 'PENDING' ? 'bg-yellow-100 text-yellow-800'
                    : key === 'IN_PROGRESS' ? 'bg-green-100 text-green-800'
                    : key === 'ASSIGNED' ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <ClipboardDocumentListIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga projekt</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">Kom igång genom att skapa ditt första projekt.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProjects.map((project: Project) => (
              <div key={project.id} className="px-4 sm:px-6 py-3 sm:py-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="flex-1 min-w-0 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {project.title}
                        {project.status === 'COMPLETED' && (
                          <CheckCircleIcon className="inline-block h-4 w-4 sm:h-5 sm:w-5 text-green-600 ml-1" />
                        )}
                      </h3>
                      <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>

                    {/* Description - hidden on mobile */}
                    <p className="hidden sm:block text-gray-600 mb-3 line-clamp-2">{project.description}</p>

                    {/* Details - compact on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1 truncate">
                        <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{project.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    </div>

                    {project.assignedTo && (
                      <div className="mt-2 sm:mt-3">
                        <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-50 rounded-full">
                          <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                          <span className="text-xs sm:text-sm text-blue-800">{project.assignedTo.name}</span>
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Mobile: 3-dot menu */}
                  <ProjectActionMenu
                    project={project}
                    contractors={contractors}
                    onEdit={() => handleEdit(project)}
                    onDelete={() => handleDelete(project)}
                    onAssign={() => handleAssign(project)}
                    onQuickAssign={(contractorId) => handleQuickAssign(project, contractorId)}
                    onChangeStatus={(status) => {
                      if (status === 'COMPLETED') {
                        if (confirm('Markera som färdig?')) changeStatusMutation.mutate({ projectId: project.id, status });
                      } else if (status === 'CANCELLED') {
                        if (confirm('Avbryta projektet?')) changeStatusMutation.mutate({ projectId: project.id, status });
                      } else {
                        changeStatusMutation.mutate({ projectId: project.id, status });
                      }
                    }}
                  />

                  {/* Desktop: inline buttons */}
                  <div className="hidden sm:flex items-center gap-1 ml-4">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Visa detaljer"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>

                    {/* Quick status change dropdown */}
                    <div className="relative group">
                      <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Ändra status">
                        <ArrowPathIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="py-1">
                          <p className="text-xs text-gray-500 px-3 py-1">Ändra status:</p>
                          {project.status !== 'IN_PROGRESS' && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatusMutation.mutate({ projectId: project.id, status: 'IN_PROGRESS' }); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-700">
                              Pågående
                            </button>
                          )}
                          {project.status !== 'COMPLETED' && (
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Markera som färdig?')) changeStatusMutation.mutate({ projectId: project.id, status: 'COMPLETED' }); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                              Färdig
                            </button>
                          )}
                          {project.status !== 'CANCELLED' && (
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Avbryta projektet?')) changeStatusMutation.mutate({ projectId: project.id, status: 'CANCELLED' }); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600">
                              Avbruten
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {project.status === 'PENDING' && (
                      <div className="relative group">
                        <button onClick={() => handleAssign(project)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Tilldela projekt">
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="p-2">
                            <p className="text-xs text-gray-500 mb-2">Snabbtilldela till:</p>
                            {contractors.filter((c: any) => c.isActive).slice(0, 3).map((contractor: any) => (
                              <button key={contractor.id} onClick={(e) => { e.stopPropagation(); handleQuickAssign(project, contractor.id); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                                {contractor.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <button onClick={() => handleEdit(project)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Redigera projekt">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(project)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Ta bort projekt">
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
        onClose={() => { setIsModalOpen(false); setEditingProject(undefined); }}
        onSubmit={handleSubmit}
        contractors={contractors}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};

export default AdminProjects;
