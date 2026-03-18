import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngTuple, LatLngBounds } from 'leaflet';
import L from 'leaflet';
import {
  MapIcon,
  MapPinIcon,
  ClockIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useBasePath } from '../../hooks/useBasePath';
import { Project } from '../../types';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProjectWithCoordinates extends Project {
  coordinates?: { lat: number; lng: number };
}

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!address || !address.trim()) return null;
  try {
    // Try full address first
    const response = await api.geocodeAddress(address + ', Sweden');
    if (response.success && response.results?.length > 0) {
      return { lat: response.results[0].lat, lng: response.results[0].lon };
    }
    // Fallback: try just city/postal code (last parts of address)
    const parts = address.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const fallback = parts.slice(1).join(', ') + ', Sweden';
      const fallbackResponse = await api.geocodeAddress(fallback);
      if (fallbackResponse.success && fallbackResponse.results?.length > 0) {
        return { lat: fallbackResponse.results[0].lat, lng: fallbackResponse.results[0].lon };
      }
    }
    // Fallback: extract city name from address (common Swedish patterns)
    const cityMatch = address.match(/\b(Uppsala|Stockholm|Göteborg|Malmö|Västerås|Örebro|Linköping|Helsingborg|Jönköping|Norrköping|Lund|Umeå|Gävle|Borås|Södertälje|Eskilstuna|Halmstad|Växjö|Karlstad|Sundsvall|Täby|Solna|Huddinge)\b/i);
    if (cityMatch) {
      const cityResponse = await api.geocodeAddress(cityMatch[0] + ', Sweden');
      if (cityResponse.success && cityResponse.results?.length > 0) {
        return { lat: cityResponse.results[0].lat, lng: cityResponse.results[0].lon };
      }
    }
    // Fallback: try postal code
    const postalMatch = address.match(/\b(\d{3}\s?\d{2})\b/);
    if (postalMatch) {
      const postalResponse = await api.geocodeAddress(postalMatch[0] + ', Sweden');
      if (postalResponse.success && postalResponse.results?.length > 0) {
        return { lat: postalResponse.results[0].lat, lng: postalResponse.results[0].lon };
      }
    }
    return null;
  } catch {
    return null;
  }
};

const createCustomIcon = (status: string, priority: string) => {
  const color =
    status === 'IN_PROGRESS' ? '#10b981' :
    priority === 'URGENT' ? '#dc2626' :
    priority === 'HIGH' ? '#ea580c' :
    status === 'ASSIGNED' ? '#3b82f6' :
    status === 'PENDING' ? '#f59e0b' : '#6b7280';

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 28px; height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

// Auto-fit map bounds
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

// Fly to position
function FlyToProject({ position }: { position: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 0.8 });
    }
  }, [position, map]);
  return null;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Vantande',
  ASSIGNED: 'Tilldelad',
  IN_PROGRESS: 'Pagaende',
  COMPLETED: 'Klar',
  CANCELLED: 'Avbruten',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'Bradskande';
    case 'HIGH': return 'Hog';
    case 'NORMAL': return 'Normal';
    case 'LOW': return 'Lag';
    default: return 'Normal';
  }
};

const getPriorityDotColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'NORMAL': return 'bg-blue-500';
    default: return 'bg-gray-400';
  }
};

const openDirections = (address: string, lat?: number, lng?: number) => {
  const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
  }
};

const MapView: React.FC = () => {
  const basePath = useBasePath();
  const [projectsWithCoords, setProjectsWithCoords] = useState<ProjectWithCoordinates[]>([]);
  const [geocodingDone, setGeocodingDone] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithCoordinates | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [flyTarget, setFlyTarget] = useState<LatLngTuple | null>(null);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['my-projects-map'],
    queryFn: () => api.getMyProjects(),
  });

  // getMyProjects() always returns an array now
  const projects: Project[] = projectsData || [];

  const defaultCenter: LatLngTuple = [59.3293, 18.0686];

  useEffect(() => {
    const geocodeProjects = async () => {
      if (!projects.length) {
        setProjectsWithCoords([]);
        return;
      }
      setGeocodingDone(false);
      const withCoords = await Promise.all(
        projects.map(async (project: Project) => {
          const coords = await geocodeAddress(project.address);
          return { ...project, coordinates: coords || undefined };
        })
      );
      // Keep ALL projects (with and without coordinates) for the list
      setProjectsWithCoords(withCoords);
      setGeocodingDone(true);
    };
    geocodeProjects();
  }, [projects]);

  const markerPositions: LatLngTuple[] = projectsWithCoords
    .filter(p => p.coordinates)
    .map(p => [p.coordinates!.lat, p.coordinates!.lng] as LatLngTuple);

  const handleProjectClick = (project: ProjectWithCoordinates) => {
    setSelectedProject(project);
    if (project.coordinates) {
      setFlyTarget([project.coordinates.lat, project.coordinates.lng]);
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
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">Projektkarta</h1>
            <p className="text-xs text-gray-500">
              {projects.length} projekt{markerPositions.length < projects.length && geocodingDone ? ` (${markerPositions.length} pa kartan)` : ''}
              {!geocodingDone && projects.length > 0 && ' (laddar positioner...)'}
            </p>
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markerPositions.length > 0 && <FitBounds positions={markerPositions} />}
            <FlyToProject position={flyTarget} />

            {projectsWithCoords.map((project) => (
              project.coordinates && (
                <Marker
                  key={project.id}
                  position={[project.coordinates.lat, project.coordinates.lng]}
                  icon={createCustomIcon(project.status, project.priority)}
                  eventHandlers={{ click: () => handleProjectClick(project) }}
                >
                  <Popup>
                    <div className="p-1 min-w-[220px]">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{project.title}</h3>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{project.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || statusColors.PENDING}`}>
                            {statusLabels[project.status] || project.status}
                          </span>
                        </div>
                        {project.deadline && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Deadline: {new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Link
                          to={`${basePath}/projects/${project.id}`}
                          className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700"
                        >
                          Visa projekt
                        </Link>
                        <button
                          onClick={() => openDirections(project.address, project.coordinates?.lat, project.coordinates?.lng)}
                          className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-emerald-700"
                        >
                          Vagbeskrivning
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Mobile: Bottom Sheet / Desktop: Side Panel */}
        <div className={`
          lg:flex-1 lg:relative lg:rounded-lg lg:shadow lg:bg-white lg:overflow-hidden lg:flex lg:flex-col
          fixed bottom-0 left-0 right-0 lg:static z-30 lg:z-auto
          bg-white rounded-t-2xl lg:rounded-lg shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:shadow
          transition-all duration-300 ease-in-out
          ${listExpanded ? 'max-h-[70dvh]' : selectedProject ? 'max-h-[300px]' : 'max-h-[160px]'}
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
              <span>{projects.length} projekt</span>
            </div>
          </button>

          {/* Selected Project Detail */}
          {selectedProject && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{selectedProject.title}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedProject.status] || statusColors.PENDING}`}>
                      {statusLabels[selectedProject.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{selectedProject.address}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BuildingOfficeIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{selectedProject.clientName}</span>
                    </div>
                    {selectedProject.clientPhone && (
                      <div className="flex items-center gap-1">
                        <PhoneIcon className="h-3 w-3 flex-shrink-0" />
                        <a href={`tel:${selectedProject.clientPhone}`} className="text-blue-600">
                          {selectedProject.clientPhone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`${basePath}/projects/${selectedProject.id}`}
                      className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700"
                    >
                      Visa projekt
                    </Link>
                    <button
                      onClick={() => openDirections(
                        selectedProject.address,
                        selectedProject.coordinates?.lat,
                        selectedProject.coordinates?.lng
                      )}
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
                Dina projekt ({projects.length})
              </h3>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Pag.', color: 'bg-emerald-500' },
                  { label: 'Tilld.', color: 'bg-blue-500' },
                  { label: 'Vant.', color: 'bg-yellow-500' },
                ].map(item => (
                  <span key={item.label} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable project list */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {projects.length === 0 && geocodingDone ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Inga projekt att visa
              </div>
            ) : (
              projectsWithCoords.map((project) => (
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
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{project.title}</h4>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${statusColors[project.status] || statusColors.PENDING}`}>
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{project.address || 'Ingen adress'}</span>
                        {geocodingDone && !project.coordinates && (
                          <span className="text-[10px] text-orange-500 flex-shrink-0">(ej pa karta)</span>
                        )}
                      </div>
                      {project.deadline && (
                        <div className="mt-0.5 text-xs text-gray-400 flex items-center gap-1">
                          <ClockIcon className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirections(project.address, project.coordinates?.lat, project.coordinates?.lng);
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

export default MapView;
