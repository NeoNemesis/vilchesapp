import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import { 
  MapIcon, 
  MapPinIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useBasePath } from '../../hooks/useBasePath';
import { Project } from '../../types';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix för Leaflet ikoner
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProjectWithCoordinates extends Project {
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Geocoding service för att konvertera adresser till koordinater
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Använd vår backend-proxy för geocoding (undviker CORS-problem)
    const response = await api.geocodeAddress(address + ', Sweden');
    
    if (response.success && response.results && response.results.length > 0) {
      const result = response.results[0];
      return {
        lat: result.lat,
        lng: result.lon
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Skapa anpassade ikoner baserat på prioritet
const createCustomIcon = (priority: string) => {
  const color = 
    priority === 'URGENT' ? '#dc2626' :
    priority === 'HIGH' ? '#ea580c' :
    priority === 'NORMAL' ? '#2563eb' : '#6b7280';

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color}; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px; 
          height: 8px; 
          background-color: white; 
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const MapView: React.FC = () => {
  const basePath = useBasePath();
  const [projectsWithCoords, setProjectsWithCoords] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => api.get('/projects/contractor').then(res => res.data.projects)
  });

  // Stockholm som standardposition
  const defaultCenter: LatLngTuple = [59.3293, 18.0686];

  useEffect(() => {
    const geocodeProjects = async () => {
      if (!projects.length) return;
      
      setLoading(true);
      const projectsWithCoordinates = await Promise.all(
        projects.map(async (project: Project) => {
          const coords = await geocodeAddress(project.address);
          return {
            ...project,
            coordinates: coords
          };
        })
      );
      
      setProjectsWithCoords(projectsWithCoordinates.filter(p => p.coordinates));
      setLoading(false);
    };

    geocodeProjects();
  }, [projects]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'NORMAL': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'LOW': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Brådskande';
      case 'HIGH': return 'Hög';
      case 'NORMAL': return 'Normal';
      case 'LOW': return 'Låg';
      default: return 'Normal';
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <MapIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projektkarta</h1>
              <p className="text-gray-600">Geografisk översikt över dina projekt</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="h-96 lg:h-[600px]">
              <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {projectsWithCoords.map((project) => (
                  (project as ProjectWithCoordinates).coordinates && (
                    <Marker
                      key={project.id}
                      position={[(project as ProjectWithCoordinates).coordinates!.lat, (project as ProjectWithCoordinates).coordinates!.lng]}
                      icon={createCustomIcon(project.priority)}
                      eventHandlers={{
                        click: () => setSelectedProject(project)
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[250px]">
                          <h3 className="font-semibold text-gray-900 mb-2">{project.title}</h3>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <MapPinIcon className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">{project.address}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(project.priority)}`}>
                                {getPriorityLabel(project.priority)} prioritet
                              </span>
                            </div>
                            
                            {project.deadline && (
                              <div className="flex items-center space-x-2">
                                <ClockIcon className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">
                                  Deadline: {new Date(project.deadline).toLocaleDateString('sv-SE')}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <Link
                            to={`${basePath}/projects/${project.id}`}
                            className="mt-3 inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Visa projekt
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Dina projekt</h3>
              <p className="text-sm text-gray-600">{projectsWithCoords.length} projekt på kartan</p>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {projectsWithCoords.map((project) => (
                <div
                  key={project.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedProject?.id === project.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{project.title}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-3 w-3" />
                          <span>{project.address}</span>
                        </div>
                        {project.deadline && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      project.priority === 'URGENT' ? 'bg-red-500' :
                      project.priority === 'HIGH' ? 'bg-orange-500' :
                      project.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Project Details */}
          {selectedProject && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Projektdetaljer</h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedProject.title}</h4>
                  <p className="text-sm text-gray-600">{selectedProject.description}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Kund:</span>
                    <span>{selectedProject.clientName}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                    <a href={`mailto:${selectedProject.clientEmail}`} className="text-blue-600 hover:underline">
                      {selectedProject.clientEmail}
                    </a>
                  </div>
                  
                  {selectedProject.clientPhone && (
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 text-gray-500" />
                      <a href={`tel:${selectedProject.clientPhone}`} className="text-blue-600 hover:underline">
                        {selectedProject.clientPhone}
                      </a>
                    </div>
                  )}
                  
                  {selectedProject.estimatedHours && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <span>Uppskattad tid: {selectedProject.estimatedHours} timmar</span>
                    </div>
                  )}
                </div>
                
                <Link
                  to={`${basePath}/projects/${selectedProject.id}`}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                >
                  Visa fullständigt projekt
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Förklaring</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm text-gray-700">Brådskande</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm text-gray-700">Hög prioritet</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm text-gray-700">Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm text-gray-700">Låg prioritet</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;

