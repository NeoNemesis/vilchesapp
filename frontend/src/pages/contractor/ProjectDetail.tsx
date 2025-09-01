import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPinIcon,
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const ContractorProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imageError, setImageError] = useState<string[]>([]);
  
  const { data: project, isLoading } = useQuery({ 
    queryKey: ['project', id], 
    queryFn: () => api.getProjectDetail(id!) 
  });

  const handleImageError = (imageId: string, imageUrl?: string) => {
    console.error('Failed to load image:', imageId, 'URL:', imageUrl);
    setImageError(prev => [...prev, imageId]);
  };

  const getImageUrl = (image: any) => {
    // Använd base64-data om det finns (föredraget för nya projekt)
    if (image.base64Data) {
      console.log('✅ Using base64 data for image:', image.originalName);
      return image.base64Data;
    }
    
    // Fallback till bildproxy-endpoint för äldre projekt eller om base64 misslyckas
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const filename = image.filename || image.url.split('/').pop();
    const imageUrl = `${baseUrl}/projects/image/${filename}`;
    
    console.log('⚡ Using proxy endpoint for image:', image.originalName, '→', imageUrl);
    return imageUrl;
  };

  const openImageModal = (image: any) => {
    console.log('Opening image modal for:', image.originalName);
    setSelectedImage(image);
  };

  const closeImageModal = () => {
    console.log('Closing image modal');
    setSelectedImage(null);
  };

  // Keyboard support för modal och förhindra body-scrolling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        closeImageModal();
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Projekt hittades inte</h3>
        <p className="mt-1 text-sm text-gray-500">Det begärda projektet kunde inte hittas.</p>
        <div className="mt-6">
          <Link
            to="/contractor/projects"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
            Tillbaka till projekt
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/contractor/projects"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="-ml-1 mr-1 h-5 w-5" />
          Tillbaka till mina projekt
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {getPriorityIcon(project.priority)}
            {getStatusBadge(project.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektbeskrivning</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>

          {/* Project Images */}
          {project.images && project.images.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PhotoIcon className="h-5 w-5 mr-2" />
                Projektbilder ({project.images.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.images.map((image: any, index: number) => (
                  <div key={image.id} className="relative group">
                    {!imageError.includes(image.id) ? (
                      <>
                        <div 
                          className="relative w-full h-48 cursor-pointer rounded-lg overflow-hidden border border-gray-200 transition-transform hover:scale-105"
                          onClick={() => openImageModal(image)}
                        >
                          <img
                            src={getImageUrl(image)}
                            alt={image.originalName}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(image.id, getImageUrl(image))}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                            <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center px-2">
                              <MagnifyingGlassPlusIcon className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm font-medium">Klicka för att förstora</p>
                              <p className="text-xs">{image.originalName}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm font-medium">Kunde inte ladda bild</p>
                          <p className="text-xs">{image.originalName}</p>
                          <p className="text-xs mt-1">Försökte ladda: {getImageUrl(image)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektinformation</h2>
            <dl className="space-y-3">
              <div>
                <dt className="flex items-center text-sm font-medium text-gray-500">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  Adress
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{project.address}</dd>
              </div>
              
              {project.deadline && (
                <div>
                  <dt className="flex items-center text-sm font-medium text-gray-500">
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Deadline
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(project.deadline), 'PPP', { locale: sv })}
                  </dd>
                </div>
              )}

              {project.estimatedHours && (
                <div>
                  <dt className="flex items-center text-sm font-medium text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Uppskattad tid
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.estimatedHours} timmar</dd>
                </div>
              )}

              <div>
                <dt className="flex items-center text-sm font-medium text-gray-500">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  Skapad
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.createdAt), 'PPP', { locale: sv })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Client Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Klientinformation</h2>
            <dl className="space-y-3">
              <div>
                <dt className="flex items-center text-sm font-medium text-gray-500">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Namn
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{project.clientName}</dd>
              </div>
              
              <div>
                <dt className="flex items-center text-sm font-medium text-gray-500">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={`mailto:${project.clientEmail}`} className="text-blue-600 hover:text-blue-800">
                    {project.clientEmail}
                  </a>
                </dd>
              </div>

              {project.clientPhone && (
                <div>
                  <dt className="flex items-center text-sm font-medium text-gray-500">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Telefon
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a href={`tel:${project.clientPhone}`} className="text-blue-600 hover:text-blue-800">
                      {project.clientPhone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Åtgärder</h2>
            {project.status === 'ASSIGNED' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Projektet är tilldelat till dig. Klicka nedan för att påbörja arbetet och skicka en rapport.
                </p>
                <Link
                  to={`/contractor/projects/${project.id}/report`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5" />
                  Skicka rapport
                </Link>
              </div>
            )}
            
            {project.status === 'IN_PROGRESS' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Projektet pågår. Du kan uppdatera din rapport eller skicka en ny.
                </p>
                <Link
                  to={`/contractor/projects/${project.id}/report`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Uppdatera rapport
                </Link>
              </div>
            )}

            {project.status === 'REPORTED' && (
              <div className="space-y-3">
                <p className="text-sm text-green-600">
                  ✅ Rapport skickad och väntar på godkännande.
                </p>
              </div>
            )}

            {project.status === 'APPROVED' && (
              <div className="space-y-3">
                <p className="text-sm text-purple-600">
                  🎉 Projekt godkänt och avslutat!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black bg-opacity-75" onClick={closeImageModal}>
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Modal content */}
            <div 
              className="relative bg-white rounded-lg shadow-xl max-w-6xl max-h-[95vh] w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Förhindra att modal stängs när man klickar på innehållet
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedImage.originalName}
                </h3>
                <button
                  onClick={closeImageModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  type="button"
                >
                  <span className="sr-only">Stäng</span>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Image Container */}
              <div className="relative overflow-auto max-h-[75vh]">
                <div className="p-4">
                  <img
                    src={getImageUrl(selectedImage)}
                    alt={selectedImage.originalName}
                    className="w-full h-auto object-contain rounded-lg"
                    style={{ maxHeight: '70vh' }}
                    onError={() => {
                      console.error('Failed to load image in modal:', selectedImage.url);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully in modal');
                    }}
                  />
                </div>
              </div>
                
              {/* Image info */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p><strong>Filnamn:</strong> {selectedImage.originalName}</p>
                    <p><strong>Typ:</strong> {selectedImage.mimeType}</p>
                  </div>
                  <div>
                    <p><strong>Storlek:</strong> {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Uppladdad:</strong> {format(new Date(selectedImage.uploadedAt), 'PPP pp', { locale: sv })}</p>
                  </div>
                </div>
                
                {/* Close button */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    onClick={closeImageModal}
                  >
                    Stäng (ESC)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorProjectDetail;

