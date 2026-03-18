import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngTuple, LatLngBounds } from 'leaflet';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  FunnelIcon,
  UserIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet icons in React
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
}

interface ProjectWithCoords extends Project {
  coordinates?: LatLngTuple;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Vantande',
  ASSIGNED: 'Tilldelad',
  IN_PROGRESS: 'Pagaende',
  COMPLETED: 'Klar',
  CANCELLED: 'Avbruten',
};

const priorityLabels: Record<string, string> = {
  URGENT: 'Bradskande',
  HIGH: 'Hog',
  NORMAL: 'Normal',
  LOW: 'Lag',
};

// Auto-fit map bounds to markers
function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = new LatLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [positions, map]);
  return null;
}

// Fly to position when selected
function FlyToProject({ position }: { position: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 0.8 });
    }
  }, [position, map]);
  return null;
}

const openDirections = (address: string, coords?: LatLngTuple) => {
  const destination = coords ? `${coords[0]},${coords[1]}` : encodeURIComponent(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
  }
};

const AdminMapView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectWithCoords | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [flyTarget, setFlyTarget] = useState<LatLngTuple | null>(null);
  const [projectsWithCoordinates, setProjectsWithCoordinates] = useState<ProjectWithCoords[]>([]);
  const [geocodingDone, setGeocodingDone] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: () => api.getAllProjects(),
  });

  const defaultCenter: LatLngTuple = [59.3293, 18.0686];

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address || !address.trim()) return null;
    try {
      const response = await api.geocodeAddress(address + ', Sweden');
      if (response.success && response.results?.length > 0) {
        return { lat: response.results[0].lat, lng: response.results[0].lon };
      }
      // Fallback: try just city/postal parts
      const parts = address.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        const fallback = parts.slice(1).join(', ') + ', Sweden';
        const fbResp = await api.geocodeAddress(fallback);
        if (fbResp.success && fbResp.results?.length > 0) {
          return { lat: fbResp.results[0].lat, lng: fbResp.results[0].lon };
        }
      }
      // Fallback: extract city name
      const cityMatch = address.match(/\b(Uppsala|Stockholm|Göteborg|Malmö|Västerås|Örebro|Linköping|Helsingborg|Jönköping|Norrköping|Lund|Umeå|Gävle|Borås|Södertälje|Eskilstuna|Halmstad|Växjö|Karlstad|Sundsvall|Täby|Solna|Huddinge)\b/i);
      if (cityMatch) {
        const cityResp = await api.geocodeAddress(cityMatch[0] + ', Sweden');
        if (cityResp.success && cityResp.results?.length > 0) {
          return { lat: cityResp.results[0].lat, lng: cityResp.results[0].lon };
        }
      }
      // Fallback: postal code
      const postalMatch = address.match(/\b(\d{3}\s?\d{2})\b/);
      if (postalMatch) {
        const postalResp = await api.geocodeAddress(postalMatch[0] + ', Sweden');
        if (postalResp.success && postalResp.results?.length > 0) {
          return { lat: postalResp.results[0].lat, lng: postalResp.results[0].lon };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const addCoordinates = async () => {
      if (!projects?.length) return;
      const withCoords = await Promise.all(
        projects.map(async (project: Project) => {
          const coords = await geocodeAddress(project.address);
          return {
            ...project,
            coordinates: coords ? [coords.lat, coords.lng] as LatLngTuple : undefined,
          };
        })
      );
      setProjectsWithCoordinates(withCoords);
      setGeocodingDone(true);
    };
    addCoordinates();
  }, [projects]);

  const filteredProjects = projectsWithCoordinates.filter((p) => {
    switch (selectedFilter) {
      case 'pending': return p.status === 'PENDING';
      case 'assigned': return p.status === 'ASSIGNED';
      case 'in-progress': return p.status === 'IN_PROGRESS';
      case 'urgent': return p.priority === 'URGENT';
      case 'with-deadline': return !!p.deadline;
      default: return true;
    }
  });

  const mappedProjects = filteredProjects.filter(p => p.coordinates);
  const markerPositions = mappedProjects.map(p => p.coordinates!);

  const getMarkerIcon = (project: Project) => {
    let color = '#3B82F6';
    if (project.status === 'IN_PROGRESS') color = '#10B981';
    else if (project.priority === 'URGENT') color = '#EF4444';
    else if (project.priority === 'HIGH') color = '#F97316';
    else if (project.status === 'COMPLETED') color = '#6B7280';
    else if (project.status === 'PENDING') color = '#F59E0B';

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="28" height="42" viewBox="0 0 28 42" xmlns="http://www.w3.org/2000/svg">
          <filter id="s" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
          <path filter="url(#s)" fill="${color}" d="M14 0C6.268 0 0 6.268 0 14c0 14 14 28 14 28s14-14 14-28C28 6.268 21.732 0 14 0z"/>
          <circle fill="white" cx="14" cy="14" r="6"/>
        </svg>
      `)}`,
      iconSize: [28, 42],
      iconAnchor: [14, 42],
      popupAnchor: [0, -36],
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-emerald-100 text-emerald-800',
      COMPLETED: 'bg-gray-100 text-gray-700',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      URGENT: 'text-red-600',
      HIGH: 'text-orange-600',
      NORMAL: 'text-blue-600',
      LOW: 'text-gray-500',
    };
    return (
      <span className={`text-xs font-semibold ${styles[priority] || styles.NORMAL}`}>
        {priority === 'URGENT' && <ExclamationTriangleIcon className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
        {priorityLabels[priority] || priority}
      </span>
    );
  };

  const handleProjectClick = (project: ProjectWithCoords) => {
    setSelectedProject(project);
    if (project.coordinates) {
      setFlyTarget(project.coordinates);
    }
    if (window.innerWidth < 1024) {
      setListExpanded(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500">Laddar projekt...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-2rem)]">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPinIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">Projektkarta</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {mappedProjects.length} av {filteredProjects.length} projekt pa kartan
                {!geocodingDone && ' (laddar positioner...)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <FunnelIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Alla ({projectsWithCoordinates.length})</option>
              <option value="in-progress">Pagaende</option>
              <option value="assigned">Tilldelade</option>
              <option value="pending">Vantande</option>
              <option value="urgent">Bradskande</option>
              <option value="with-deadline">Med deadline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-4 lg:p-4 min-h-0 relative">
        {/* Map */}
        <div className="flex-1 lg:flex-[2] min-h-[50dvh] lg:min-h-0 lg:rounded-lg lg:shadow overflow-hidden relative z-0">
          <MapContainer
            center={defaultCenter}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {markerPositions.length > 0 && <FitBounds positions={markerPositions} />}
            <FlyToProject position={flyTarget} />

            {mappedProjects.map((project) => (
              <Marker
                key={project.id}
                position={project.coordinates!}
                icon={getMarkerIcon(project)}
                eventHandlers={{ click: () => handleProjectClick(project) }}
              >
                <Popup>
                  <div className="min-w-[220px] p-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{project.title}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{project.address}</span>
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">Kund:</span> {project.clientName}
                      </div>
                      {project.assignedTo && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <UserIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{project.assignedTo.name}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <CalendarDaysIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        {getStatusBadge(project.status)}
                        {getPriorityBadge(project.priority)}
                      </div>
                      <div className="flex gap-2 pt-1.5 border-t mt-1.5">
                        <Link
                          to={`/admin/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Visa detaljer
                        </Link>
                        <button
                          onClick={() => openDirections(project.address, project.coordinates)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                        >
                          Vagbeskrivning
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Mobile: Bottom Sheet / Desktop: Side Panel */}
        <div className={`
          lg:flex-1 lg:relative lg:rounded-lg lg:shadow lg:bg-white lg:overflow-hidden lg:flex lg:flex-col
          fixed bottom-0 left-0 right-0 lg:static z-30 lg:z-auto
          bg-white rounded-t-2xl lg:rounded-lg shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:shadow
          transition-all duration-300 ease-in-out
          ${listExpanded ? 'max-h-[70dvh]' : selectedProject ? 'max-h-[300px]' : 'max-h-[180px]'}
          lg:max-h-none
        `}>
          {/* Drag handle (mobile only) */}
          <button
            onClick={() => setListExpanded(!listExpanded)}
            className="lg:hidden w-full flex flex-col items-center pt-2 pb-1 cursor-pointer"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {listExpanded ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronUpIcon className="h-3 w-3" />}
              <span>{filteredProjects.length} projekt</span>
            </div>
          </button>

          {/* Selected project detail */}
          {selectedProject && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{selectedProject.title}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(selectedProject.status)}
                    {getPriorityBadge(selectedProject.priority)}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{selectedProject.address}</span>
                    </div>
                    {selectedProject.assignedTo && (
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{selectedProject.assignedTo.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`/admin/projects/${selectedProject.id}`}
                      className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700"
                    >
                      Visa projekt
                    </Link>
                    <button
                      onClick={() => openDirections(selectedProject.address, selectedProject.coordinates)}
                      className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      Vagbeskrivning
                    </button>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProject(null); }}
                  className="p-1 rounded-full hover:bg-blue-100 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Project list header */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Projekt ({filteredProjects.length})
              </h3>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Pag.', color: 'bg-emerald-500' },
                  { label: 'Tilld.', color: 'bg-blue-500' },
                  { label: 'Vant.', color: 'bg-yellow-500' },
                  { label: 'Brad.', color: 'bg-red-500' },
                ].map(item => (
                  <span key={item.label} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Inga projekt matchar filtret
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50/50 active:bg-blue-50 transition-colors ${
                    selectedProject?.id === project.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/projects/${project.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-700 line-clamp-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.title}
                        </Link>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                          project.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-800' :
                          project.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 truncate">
                        {project.clientName}
                        {project.assignedTo && ` \u2022 ${project.assignedTo.name}`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirections(project.address, project.coordinates);
                      }}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 flex-shrink-0"
                      title="Vagbeskrivning"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapView;
