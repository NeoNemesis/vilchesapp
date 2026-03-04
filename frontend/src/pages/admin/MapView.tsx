import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  FunnelIcon,
  UserIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix för Leaflet ikoner i React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Project {
  id: string;
  title: string;
  address: string;
  clientName: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  deadline?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const AdminMapView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: () => api.getAllProjects()
  });

  // Stockholm som standardposition
  const defaultCenter: LatLngTuple = [59.3293, 18.0686];

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

  // State för projekt med koordinater
  const [projectsWithCoordinates, setProjectsWithCoordinates] = useState<(Project & { coordinates?: LatLngTuple })[]>([]);

  // Lägg till koordinater till projekt
  useEffect(() => {
    const addCoordinatesToProjects = async () => {
      if (!projects || projects.length === 0) return;

      const projectsWithCoords = await Promise.all(
        projects.map(async (project: Project) => {
          const coords = await geocodeAddress(project.address);
          return {
            ...project,
            coordinates: coords ? [coords.lat, coords.lng] as LatLngTuple : defaultCenter
          };
        })
      );

      setProjectsWithCoordinates(projectsWithCoords);
    };

    addCoordinatesToProjects();
  }, [projects]);

  const filteredProjects = projectsWithCoordinates.filter((project: Project & { coordinates?: LatLngTuple }) => {
    switch (selectedFilter) {
      case 'pending':
        return project.status === 'PENDING';
      case 'assigned':
        return project.status === 'ASSIGNED';
      case 'in-progress':
        return project.status === 'IN_PROGRESS';
      case 'urgent':
        return project.priority === 'URGENT';
      case 'with-deadline':
        return !!project.deadline;
      default:
        return true;
    }
  });

  const getMarkerIcon = (project: Project) => {
    let color = '#3B82F6'; // blue (normal)
    
    if (project.priority === 'URGENT') color = '#EF4444'; // red
    else if (project.priority === 'HIGH') color = '#F97316'; // orange
    else if (project.status === 'COMPLETED') color = '#10B981'; // green
    else if (project.status === 'PENDING') color = '#F59E0B'; // yellow

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path fill="${color}" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.596 19.404 0 12.5 0z"/>
          <circle fill="white" cx="12.5" cy="12.5" r="6"/>
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'NORMAL': return 'text-blue-600';
      case 'LOW': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projektkarta - Admin</h1>
                <p className="text-gray-600">Geografisk översikt över alla projekt</p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-3">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Alla projekt</option>
                <option value="pending">Väntande</option>
                <option value="assigned">Tilldelade</option>
                <option value="in-progress">Pågående</option>
                <option value="urgent">Brådskande</option>
                <option value="with-deadline">Med deadline</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {filteredProjects.map((project: Project & { coordinates?: LatLngTuple }) => 
              project.coordinates ? (
              <Marker
                key={project.id}
                position={project.coordinates}
                icon={getMarkerIcon(project)}
                eventHandlers={{
                  click: () => setSelectedProject(project),
                }}
              >
                <Popup>
                  <div className="min-w-[250px] p-2">
                    <h3 className="font-semibold text-gray-900 mb-2">{project.title}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{project.address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Kund:</span>
                        <span className="text-gray-900">{project.clientName}</span>
                      </div>
                      {project.assignedTo && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{project.assignedTo.name}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center space-x-2">
                          <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {new Date(project.deadline).toLocaleDateString('sv-SE')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority === 'URGENT' && <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />}
                          {project.priority}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <Link
                          to={`/admin/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Visa detaljer →
                        </Link>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Project List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              Projekt ({filteredProjects.length})
            </h3>
          </div>
          <div className="overflow-y-auto max-h-full">
            {filteredProjects.map((project: Project & { coordinates?: LatLngTuple }) => (
              <div
                key={project.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedProject?.id === project.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                    >
                      {project.title}
                    </Link>
                    <div className="mt-1 text-sm text-gray-500 flex items-center space-x-1">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <span className="font-medium">Kund:</span> {project.clientName}
                    </div>
                    {project.assignedTo && (
                      <div className="mt-1 text-sm text-gray-500 flex items-center space-x-1">
                        <UserIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{project.assignedTo.name}</span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="mt-1 text-sm text-gray-500 flex items-center space-x-1">
                        <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex flex-col items-end space-y-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority === 'URGENT' && <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />}
                      {project.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Kartförklaring</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Brådskande</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Hög prioritet</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Normal/Tilldelad</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Väntande</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Klar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapView;
