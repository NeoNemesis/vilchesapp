import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, createSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  UserPlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Project, Contractor } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ProjectModal } from '../../components/ProjectModal';


const AdminProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imageError, setImageError] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);


  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id!),
    enabled: !!id,
  });

  // Fetch contractors for assignment
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: api.getContractors,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateProject(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      setIsEditing(false);
      toast.success('Projekt uppdaterat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera projekt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      toast.success('Projekt borttaget!');
      navigate('/admin/projects');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort projekt');
    }
  });

  const markAsCompletedMutation = useMutation({
    mutationFn: () => api.updateProject(id!, { status: 'COMPLETED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      toast.success('Projekt markerat som färdigt!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera projektstatus');
    }
  });

  const changeStatusMutation = useMutation({
    mutationFn: (newStatus: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => api.updateProject(id!, { status: newStatus }),
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      setShowStatusMenu(false);
      const statusLabels: Record<string, string> = {
        'PENDING': 'Väntar',
        'ASSIGNED': 'Tilldelad',
        'IN_PROGRESS': 'Pågående',
        'COMPLETED': 'Färdig',
        'CANCELLED': 'Avbruten'
      };
      toast.success(`Status ändrad till "${statusLabels[newStatus] || newStatus}"!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ändra projektstatus');
    }
  });

  const assignMutation = useMutation({
    mutationFn: (contractorId: string) => api.assignProject(id!, contractorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      setShowAssignModal(false);
      toast.success('Projekt tilldelat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte tilldela projekt');
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteProjectImage(id!, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Bild raderad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte radera bild');
    }
  });

  const handleDelete = () => {
    if (confirm(`Är du säker på att du vill ta bort projektet "${project?.title}"?`)) {
      deleteMutation.mutate();
    }
  };

  const handleMarkAsCompleted = () => {
    if (confirm(`Markera projektet "${project?.title}" som färdigt?`)) {
      markAsCompletedMutation.mutate();
    }
  };

  const handleAssign = (contractorId: string) => {
    assignMutation.mutate(contractorId);
  };

  // Bildhantering (samma som contractor-versionen)
  const handleImageError = (imageId: string, imageUrl?: string) => {
    console.error('Failed to load image:', imageId, 'URL:', imageUrl);
    setImageError(prev => [...prev, imageId]);
  };

  const getImageUrl = (image: any) => {
    // Använd base64-data om det finns (föredraget för nya projekt)
    if (image.base64Data) {
      return image.base64Data;
    }

    // Fallback till bildproxy-endpoint för äldre projekt eller om base64 misslyckas
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const filename = image.filename || image.url.split('/').pop();
    const imageUrl = `${baseUrl}/projects/image/${filename}`;

    return imageUrl;
  };

  const openImageModal = (image: any) => {
    setSelectedImage(image);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-status-menu]')) {
          setShowStatusMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusMenu]);

  // Keyboard support för modal och förhindra body-scrolling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        closeImageModal();
      }
      if (event.key === 'Escape' && showStatusMenu) {
        setShowStatusMenu(false);
      }
    };

    if (selectedImage) {
      // Förhindra body-scrolling när modal är öppen
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // Återställ body-scrolling när modal stängs
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Väntar';
      case 'ASSIGNED': return 'Tilldelad';
      case 'IN_PROGRESS': return 'Pågående';
      case 'COMPLETED': return 'Klar';
      case 'CANCELLED': return 'Avbruten';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'NORMAL': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'LOW': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Brådskande';
      case 'HIGH': return 'Hög';
      case 'NORMAL': return 'Normal';
      case 'LOW': return 'Låg';
      default: return priority;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Projekt hittades inte</h2>
        <p className="mt-2 text-gray-600">Det begärda projektet kunde inte hittas.</p>
        <Link
          to="/admin/projects"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Tillbaka till projekt
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/admin/projects"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka till projekt
          </Link>
          <div className="flex items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative" data-status-menu>
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Ändra status
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => changeStatusMutation.mutate('PENDING')}
                      disabled={project.status === 'PENDING' || changeStatusMutation.isPending}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        project.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800' : 'text-gray-700'
                      } disabled:opacity-50`}
                    >
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Väntar
                      {project.status === 'PENDING' && <span className="ml-auto text-xs">(aktiv)</span>}
                    </button>
                    <button
                      onClick={() => changeStatusMutation.mutate('ASSIGNED')}
                      disabled={project.status === 'ASSIGNED' || changeStatusMutation.isPending}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        project.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                      } disabled:opacity-50`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Tilldelad
                      {project.status === 'ASSIGNED' && <span className="ml-auto text-xs">(aktiv)</span>}
                    </button>
                    <button
                      onClick={() => changeStatusMutation.mutate('IN_PROGRESS')}
                      disabled={project.status === 'IN_PROGRESS' || changeStatusMutation.isPending}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        project.status === 'IN_PROGRESS' ? 'bg-green-50 text-green-800' : 'text-gray-700'
                      } disabled:opacity-50`}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Pågående
                      {project.status === 'IN_PROGRESS' && <span className="ml-auto text-xs">(aktiv)</span>}
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        if (confirm('Vill du markera projektet som färdigt?')) {
                          changeStatusMutation.mutate('COMPLETED');
                        }
                      }}
                      disabled={project.status === 'COMPLETED' || changeStatusMutation.isPending}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        project.status === 'COMPLETED' ? 'bg-gray-50 text-gray-800' : 'text-gray-700'
                      } disabled:opacity-50`}
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                      Färdig (Avsluta)
                      {project.status === 'COMPLETED' && <span className="ml-auto text-xs">(aktiv)</span>}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Vill du avbryta projektet? Detta kan inte ångras.')) {
                          changeStatusMutation.mutate('CANCELLED');
                        }
                      }}
                      disabled={project.status === 'CANCELLED' || changeStatusMutation.isPending}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 ${
                        project.status === 'CANCELLED' ? 'bg-red-50 text-red-800' : 'text-red-600'
                      } disabled:opacity-50`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Avbruten
                      {project.status === 'CANCELLED' && <span className="ml-auto text-xs">(aktiv)</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {project.status === 'PENDING' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Tilldela
              </button>
            )}
            {!project.quoteId && (
              <button
                onClick={() => navigate(`/admin/quotes/new?projectId=${project.id}`)}
                className="inline-flex items-center px-3 py-2 bg-[#2C5F2D] text-white rounded-lg hover:bg-[#3d7a47]"
              >
                <DocumentPlusIcon className="h-4 w-4 mr-2" />
                Skapa offert
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Redigera
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Ta bort
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="mt-2 text-gray-600">{project.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
              {getStatusText(project.status)}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(project.priority)}`}>
              {getPriorityText(project.priority)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektinformation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Adress</p>
                  <p className="text-gray-900">{project.address}</p>
                </div>
              </div>
              
              {project.deadline && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Deadline</p>
                    <p className="text-gray-900">
                      {format(new Date(project.deadline), 'd MMMM yyyy', { locale: sv })}
                    </p>
                  </div>
                </div>
              )}
              
              {project.estimatedHours && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Uppskattad tid</p>
                    <p className="text-gray-900">{project.estimatedHours} timmar</p>
                  </div>
                </div>
              )}
              
              {project.estimatedCost && (
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Uppskattad kostnad</p>
                    <p className="text-gray-900">{project.estimatedCost.toLocaleString('sv-SE')} SEK</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reports */}
          {project.reports && project.reports.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Rapporter ({project.reports.length})
                </h2>
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {project.reports.map((report: any) => (
                  <div 
                    key={report.id} 
                    onClick={() => setSelectedReport(report)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 rounded-lg p-2">
                          <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{report.title || 'Projektrapport'}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Inlämnad {format(new Date(report.createdAt), 'd MMMM yyyy \'kl\' HH:mm', { locale: sv })}
                          </p>
                          {report.author && (
                            <p className="text-sm text-gray-600 mt-1">
                              av {report.author.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          report.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status === 'APPROVED' ? 'Godkänd' :
                           report.status === 'SUBMITTED' ? 'Inlämnad' :
                           report.status === 'DRAFT' ? 'Utkast' : report.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Report details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      {report.hoursWorked && (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{report.hoursWorked}h arbetade</span>
                        </div>
                      )}
                      {report.progressPercent !== undefined && (
                        <div className="flex items-center gap-2">
                          <ChartBarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{report.progressPercent}% klart</span>
                        </div>
                      )}
                      {report.images && report.images.length > 0 && (
                        <div className="flex items-center gap-2">
                          <PhotoIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{report.images.length} bilder</span>
                        </div>
                      )}
                    </div>

                    {/* Work description preview */}
                    {report.workDescription && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {report.workDescription}
                        </p>
                      </div>
                    )}

                    {/* Issues if any */}
                    {report.issues && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Problem rapporterade:</p>
                            <p className="text-sm text-yellow-700 mt-1">{report.issues}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Link
                        to={`/admin/reports/${report.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                      >
                        Visa fullständig rapport →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Inga rapporter ännu</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {project.status === 'PENDING' ? 
                    'Projektet har inte tilldelats ännu.' :
                    'Entreprenören har inte lämnat in någon rapport ännu.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Images */}
          {project.images && project.images.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Projektbilder ({project.images.length})
                </h2>
                <PhotoIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {project.images.map((image: any) => {
                  const imageUrl = getImageUrl(image);
                  const hasError = imageError.includes(image.id);
                  
                  return (
                    <div key={image.id} className="group relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        {!hasError ? (
                          <img
                            src={imageUrl}
                            alt={image.originalName || 'Projektbild'}
                            className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                            onClick={() => openImageModal(image)}
                            onError={() => handleImageError(image.id, imageUrl)}
                            crossOrigin="anonymous"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                              <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">Kunde inte ladda bild</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openImageModal(image);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MagnifyingGlassPlusIcon className="h-8 w-8 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Är du säker på att du vill radera denna bild?')) {
                                deleteImageMutation.mutate(image.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 rounded-full p-2"
                          >
                            <TrashIcon className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Image info */}
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 truncate" title={image.originalName}>
                          {image.originalName || 'Bild'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(image.uploadedAt || project.createdAt), 'd MMM', { locale: sv })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kunduppgifter</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Namn</p>
                  <p className="text-gray-900">{project.clientName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">E-post</p>
                  <a
                    href={`mailto:${project.clientEmail}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {project.clientEmail}
                  </a>
                </div>
              </div>
              
              {project.clientPhone && (
                <div className="flex items-start gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <a
                      href={`tel:${project.clientPhone}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {project.clientPhone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Contractor */}
          {project.assignedTo ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tilldelad entreprenör</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-100 rounded-full p-2">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{project.assignedTo.name}</p>
                    <p className="text-sm text-blue-600">Tilldelad entreprenör</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-post</p>
                      <a
                        href={`mailto:${project.assignedTo.email}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {project.assignedTo.email}
                      </a>
                    </div>
                  </div>
                  
                  {project.assignedTo.phone && (
                    <div className="flex items-start gap-3">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telefon</p>
                        <a
                          href={`tel:${project.assignedTo.phone}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          {project.assignedTo.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {project.assignedTo.company && (
                    <div className="flex items-start gap-3">
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Företag</p>
                        <p className="text-gray-900 text-sm">{project.assignedTo.company}</p>
                      </div>
                    </div>
                  )}
                </div>

                
                {/* Team Members */}
                {project.teamMembers && project.teamMembers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Team</p>
                    {project.teamMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{m.user.name}</span>
                        </div>
                        <button 
                          onClick={() => { 
                            if (confirm('Ta bort ' + m.user.name + '?')) {
                              fetch('/api/projects/' + project.id + '/team/' + m.user.id, {
                                method: 'DELETE',
                                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                              }).then(() => {
                                toast.success('Borttagen!');
                                queryClient.invalidateQueries({ queryKey: ['project', project.id] });
                              });
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Ta bort"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="mt-2 w-full text-sm text-blue-600 hover:text-blue-700 py-1"
                    >
                      + Lägg till fler
                    </button>
                  </div>
                )}

                {/* Quick actions */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${project.assignedTo.email}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors text-center"
                    >
                      Skicka e-post
                    </a>
                    {project.assignedTo.phone && (
                      <a
                        href={`tel:${project.assignedTo.phone}`}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors text-center"
                      >
                        Ring
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tilldelning</h2>
              <div className="text-center py-6">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Inte tilldelat</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Detta projekt har inte tilldelats en entreprenör ännu.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Tilldela nu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project Meta */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdetaljer</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Skapad</span>
                <span className="text-gray-900">
                  {format(new Date(project.createdAt), 'd MMM yyyy', { locale: sv })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-900">{getStatusText(project.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prioritet</span>
                <span className="text-gray-900">{getPriorityText(project.priority)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setShowAssignModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tilldela projekt till entreprenör
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {contractors.filter((c: any) => c.isActive).map((contractor: any) => (
                    <button
                      key={contractor.id}
                      onClick={() => handleAssign(contractor.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{contractor.name}</p>
                      <p className="text-sm text-gray-500">{contractor.email}</p>
                      {contractor.company && (
                        <p className="text-sm text-gray-500">{contractor.company}</p>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Avbryt
          </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setSelectedReport(null)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport.title || 'Projektrapport'}
                  </h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Report Header */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedReport.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        selectedReport.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedReport.status === 'APPROVED' ? 'Godkänd' :
                         selectedReport.status === 'SUBMITTED' ? 'Inlämnad' :
                         selectedReport.status === 'DRAFT' ? 'Utkast' : selectedReport.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Arbetade timmar</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedReport.hoursWorked}h</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Framsteg</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedReport.progressPercent}%</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Inlämnad</p>
                    <p className="text-gray-900">
                      {format(new Date(selectedReport.createdAt), 'd MMMM yyyy \'kl\' HH:mm', { locale: sv })}
                      {selectedReport.author && ` av ${selectedReport.author.name}`}
                    </p>
                  </div>
                </div>

                {/* Report Content */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Arbetsbeskrivning</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedReport.workDescription}</p>
                    </div>
                  </div>

                  {selectedReport.issues && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Problem rapporterade</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 whitespace-pre-wrap">{selectedReport.issues}</p>
                      </div>
                    </div>
                  )}

                  {selectedReport.nextSteps && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Nästa steg</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700 whitespace-pre-wrap">{selectedReport.nextSteps}</p>
                      </div>
                    </div>
                  )}

                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Bilder ({selectedReport.images.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedReport.images.map((image: any) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={`${import.meta.env.VITE_API_URL}${image.url}?bypass-sw=1`}
                              alt={image.description || image.originalName}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                              onClick={() => setSelectedImage(image)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Stäng bild"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.originalName || 'Projektbild'}
                className="max-w-full max-h-[80vh] object-contain"
                onError={() => handleImageError(selectedImage.id, getImageUrl(selectedImage))}
              />
              
              <div className="p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900">
                  {selectedImage.originalName || 'Projektbild'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Uppladdad {format(new Date(selectedImage.uploadedAt || project.createdAt), 'd MMMM yyyy \'kl\' HH:mm', { locale: sv })}
                </p>
                {selectedImage.size && (
                  <p className="text-sm text-gray-500">
                    Storlek: {(selectedImage.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectModal
        project={project}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSubmit={(data) => updateMutation.mutate(data)}
        contractors={contractors}
        isSubmitting={updateMutation.isPending}
        onDeleteImage={(imageId) => deleteImageMutation.mutate(imageId)}
      />
    </div>
  );
};

export default AdminProjectDetail;
