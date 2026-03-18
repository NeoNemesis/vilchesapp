import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  LinkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useBasePath } from '../../hooks/useBasePath';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { CalendarEvent, CalendarEventType, Project } from '../../types';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  MEETING: 'Möte',
  SITE_VISIT: 'Platsbesök',
  DEADLINE: 'Deadline',
  TASK: 'Uppgift',
  REMINDER: 'Påminnelse',
  BLOCKED: 'Blockerad',
  OTHER: 'Övrigt',
};

const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  MEETING: 'bg-blue-500',
  SITE_VISIT: 'bg-green-500',
  DEADLINE: 'bg-red-500',
  TASK: 'bg-purple-500',
  REMINDER: 'bg-yellow-500',
  BLOCKED: 'bg-gray-500',
  OTHER: 'bg-indigo-500',
};

const Calendar: React.FC = () => {
  const basePath = useBasePath();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Hämta projekt
  const { data: projects = [] } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: async () => {
      const response = await api.getMyProjects();
      if (Array.isArray(response)) return response;
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (response?.projects && Array.isArray(response.projects)) return response.projects;
      return [];
    },
    retry: 1,
    staleTime: 30000,
  });

  // Hämta kalenderhändelser
  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', calendarStart.toISOString(), calendarEnd.toISOString()],
    queryFn: () =>
      api.getCalendarEvents({
        start: calendarStart.toISOString(),
        end: calendarEnd.toISOString(),
      }),
  });

  // Skapa händelse
  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCalendarEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Händelse skapad');
      setShowEventModal(false);
    },
    onError: () => toast.error('Kunde inte skapa händelse'),
  });

  // Svara på inbjudan
  const respondMutation = useMutation({
    mutationFn: ({ id, accepted }: { id: string; accepted: boolean }) =>
      api.respondToCalendarEvent(id, accepted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Svar skickat');
    },
  });

  const getEventsForDate = useCallback(
    (date: Date) => {
      const items: Array<{ type: 'project' | 'event'; data: any }> = [];

      if (Array.isArray(projects)) {
        projects.forEach((project: Project) => {
          if (project.deadline && isSameDay(parseISO(project.deadline), date)) {
            items.push({ type: 'project', data: project });
          }
        });
      }

      events.forEach((event: CalendarEvent) => {
        const start = parseISO(event.startTime);
        const end = parseISO(event.endTime);
        if (start <= endOfDay(date) && end >= startOfDay(date)) {
          items.push({ type: 'event', data: event });
        }
      });

      return items;
    },
    [projects, events]
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'NORMAL': return 'bg-blue-500';
      case 'LOW': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Klick på en dag -> visa dag-detalj (mobilvänligt)
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetail(true);
  };

  // Hämta items för vald dag
  const selectedDayItems = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-0">
      {/* Header - mobilvänlig */}
      <div className="bg-white shadow rounded-lg mb-3">
        <div className="px-3 py-3 sm:px-4">
          {/* Rad 1: titel + knappar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-lg font-bold text-gray-900">Min kalender</h1>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowSyncModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                title="Synkronisera"
              >
                <LinkIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setShowEventModal(true); }}
                className="flex items-center space-x-1 px-2.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Ny händelse</span>
              </button>
            </div>
          </div>

          {/* Rad 2: navigering */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-gray-100 rounded-full active:bg-gray-200">
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg active:bg-gray-300"
              >
                Idag
              </button>
              <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-gray-100 rounded-full active:bg-gray-200">
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: sv })}
            </h2>
          </div>
        </div>
      </div>

      {/* Kalender-grid - mobilvänlig */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Veckodagar-header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, i) => (
            <div key={i} className="py-2 text-center text-xs font-medium text-gray-500">
              <span className="sm:hidden">{day}</span>
              <span className="hidden sm:inline">{['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][i]}</span>
            </div>
          ))}
        </div>

        {/* Dagar */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayItems = getEventsForDate(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const hasItems = dayItems.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate) && showDayDetail;

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  relative min-h-[52px] sm:min-h-[90px] p-1 sm:p-1.5
                  border-r border-b border-gray-100 last:border-r-0
                  transition-colors active:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-inset
                  ${!inMonth ? 'bg-gray-50/50' : 'bg-white'}
                  ${today ? 'bg-blue-50/60' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : ''}
                `}
              >
                {/* Datum-nummer */}
                <div className={`
                  text-xs font-medium mb-0.5
                  ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${today ? 'text-blue-600 font-bold' : ''}
                `}>
                  <span className={today
                    ? 'bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-[11px]'
                    : ''
                  }>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Prickar på mobil / text på desktop */}
                {hasItems && (
                  <>
                    {/* Mobil: visa prickar */}
                    <div className="flex gap-0.5 flex-wrap sm:hidden mt-0.5">
                      {dayItems.slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.type === 'project'
                              ? getPriorityColor(item.data.priority)
                              : item.data.color ? '' : EVENT_TYPE_COLORS[item.data.type as CalendarEventType] || 'bg-blue-500'
                          }`}
                          style={item.type === 'event' && item.data.color ? { backgroundColor: item.data.color } : undefined}
                        />
                      ))}
                      {dayItems.length > 4 && (
                        <span className="text-[8px] text-gray-400">+{dayItems.length - 4}</span>
                      )}
                    </div>

                    {/* Desktop: visa text */}
                    <div className="hidden sm:block space-y-0.5">
                      {dayItems.slice(0, 2).map((item, idx) => {
                        if (item.type === 'project') {
                          return (
                            <div
                              key={`p-${idx}`}
                              className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${getPriorityColor(item.data.priority)}`}
                            >
                              {item.data.title}
                            </div>
                          );
                        }
                        const event = item.data as CalendarEvent;
                        return (
                          <div
                            key={`e-${idx}`}
                            className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${
                              event.color ? '' : EVENT_TYPE_COLORS[event.type]
                            }`}
                            style={event.color ? { backgroundColor: event.color } : undefined}
                          >
                            {!event.allDay && format(parseISO(event.startTime), 'HH:mm') + ' '}{event.title}
                          </div>
                        );
                      })}
                      {dayItems.length > 2 && (
                        <div className="text-[9px] text-gray-500 px-1">+{dayItems.length - 2} fler</div>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dag-detalj (visas under kalendern vid klick) */}
      {showDayDetail && selectedDate && (
        <div className="mt-3 bg-white shadow rounded-lg overflow-hidden animate-in slide-in-from-top">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {format(selectedDate, 'EEEE d MMMM', { locale: sv })}
              </h3>
              <p className="text-xs text-gray-500">{selectedDayItems.length} händelser</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setSelectedEvent(null); setShowEventModal(true); }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm active:bg-blue-800"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Lägg till</span>
              </button>
              <button
                onClick={() => setShowDayDetail(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {selectedDayItems.length === 0 ? (
              <div className="p-6 text-center">
                <CalendarDaysIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Inga händelser denna dag</p>
                <button
                  onClick={() => { setSelectedEvent(null); setShowEventModal(true); }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Skapa en händelse
                </button>
              </div>
            ) : (
              selectedDayItems.map((item, idx) => {
                if (item.type === 'project') {
                  const project = item.data as Project;
                  return (
                    <Link
                      key={`p-${project.id}`}
                      to={`${basePath}/projects/${project.id}`}
                      className="flex items-center p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mr-3 ${getPriorityColor(project.priority)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">{project.title}</div>
                        <div className="text-xs text-gray-500">Deadline · {project.address}</div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </Link>
                  );
                }

                const event = item.data as CalendarEvent;
                return (
                  <button
                    key={`e-${event.id}`}
                    onClick={() => setSelectedEvent(event)}
                    className="flex items-center w-full p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 mr-3 ${event.color ? '' : EVENT_TYPE_COLORS[event.type]}`}
                      style={event.color ? { backgroundColor: event.color } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {event.allDay
                          ? 'Heldag'
                          : `${format(parseISO(event.startTime), 'HH:mm')} – ${format(parseISO(event.endTime), 'HH:mm')}`
                        }
                        {event.location && ` · ${event.location}`}
                        <span className="ml-1 text-gray-400">· {EVENT_TYPE_LABELS[event.type]}</span>
                      </div>
                      {event.participants.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {event.participants.map((p) => p.user.name).join(', ')}
                        </div>
                      )}
                    </div>
                    {event.participants.some((p) => !p.accepted) && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          respondMutation.mutate({ id: event.id, accepted: true });
                        }}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 flex-shrink-0 ml-2"
                      >
                        Acceptera
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Kommande sektioner - stacked på mobil */}
      <div className="mt-3 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {/* Kommande händelser */}
        <div className="bg-white shadow rounded-lg p-3 sm:p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Kommande händelser</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {events
              .filter((e: CalendarEvent) => parseISO(e.startTime) >= new Date() && e.status !== 'CANCELLED')
              .slice(0, 5)
              .map((event: CalendarEvent) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 w-full text-left transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${EVENT_TYPE_COLORS[event.type]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(event.startTime), 'd MMM HH:mm', { locale: sv })}
                    </div>
                  </div>
                </button>
              ))}
            {events.filter((e: CalendarEvent) => parseISO(e.startTime) >= new Date()).length === 0 && (
              <p className="text-sm text-gray-400 py-2">Inga kommande händelser</p>
            )}
          </div>
        </div>

        {/* Kommande deadlines */}
        <div className="bg-white shadow rounded-lg p-3 sm:p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Kommande deadlines</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(Array.isArray(projects) ? projects : [])
              .filter((p: Project) => p.deadline && new Date(p.deadline) >= new Date())
              .sort((a: Project, b: Project) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
              .slice(0, 5)
              .map((project: Project) => (
                <Link
                  key={project.id}
                  to={`${basePath}/projects/${project.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityColor(project.priority)}`} />
                    <span className="text-sm font-medium text-gray-900 truncate">{project.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {format(parseISO(project.deadline!), 'd MMM', { locale: sv })}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* Förklaring - kompakt */}
      <div className="mt-3 mb-6 bg-white shadow rounded-lg p-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${EVENT_TYPE_COLORS[key as CalendarEventType]}`} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSelectedEvent(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md sm:m-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator mobil */}
            <div className="sm:hidden flex justify-center pt-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div
              className={`p-4 sm:rounded-t-xl text-white ${selectedEvent.color ? '' : EVENT_TYPE_COLORS[selectedEvent.type]}`}
              style={selectedEvent.color ? { backgroundColor: selectedEvent.color } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-90">{EVENT_TYPE_LABELS[selectedEvent.type]}</span>
                <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-white/20 rounded-full">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-lg font-bold mt-1">{selectedEvent.title}</h2>
              {selectedEvent.status === 'CANCELLED' && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-red-600 rounded text-xs">AVBOKAD</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {selectedEvent.allDay
                    ? format(parseISO(selectedEvent.startTime), 'd MMMM yyyy', { locale: sv })
                    : `${format(parseISO(selectedEvent.startTime), 'EEEE d MMM HH:mm', { locale: sv })} – ${format(parseISO(selectedEvent.endTime), 'HH:mm')}`
                  }
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedEvent.description}</div>
              )}
              {selectedEvent.participants.length > 0 && (
                <div className="flex items-start space-x-3">
                  <UserGroupIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700 space-y-0.5">
                    {selectedEvent.participants.map((p) => (
                      <div key={p.id}>
                        {p.user.name}
                        <span className={`ml-1 text-xs ${p.accepted ? 'text-green-600' : 'text-gray-400'}`}>
                          ({p.accepted ? 'Accepterat' : 'Väntar'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.project && (
                <div className="text-sm">
                  <span className="text-gray-500">Projekt: </span>
                  <Link to={`${basePath}/projects/${selectedEvent.project.id}`} className="text-blue-600 font-medium">
                    {selectedEvent.project.title}
                  </Link>
                </div>
              )}

              {/* Acceptera-knapp om inbjuden */}
              {selectedEvent.participants.some((p) => !p.accepted) && (
                <button
                  onClick={() => respondMutation.mutate({ id: selectedEvent.id, accepted: true })}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 text-sm font-medium transition-colors"
                >
                  Acceptera inbjudan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <SimpleEventModal
          defaultDate={selectedDate}
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowEventModal(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <SyncModal onClose={() => setShowSyncModal(false)} />
      )}
    </div>
  );
};

// Enkel modal för att skapa händelser - mobilvänlig bottom sheet
const SimpleEventModal: React.FC<{
  defaultDate: Date | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ defaultDate, onSubmit, onClose, isLoading }) => {
  const defaultStart = defaultDate || new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 3600000);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
  const [type, setType] = useState<CalendarEventType>('TASK');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      type,
      location: location || undefined,
      description: description || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm sm:m-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag indicator mobil */}
        <div className="sm:hidden flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ny händelse</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vad ska du göra?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEventType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Start</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Slut</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Plats (valfritt)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivning (valfritt)"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Sparar...' : 'Skapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SyncModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateFeedUrl = async () => {
    setLoading(true);
    try {
      const result = await api.getCalendarFeedUrl();
      setFeedUrl(result.feedUrl);
    } catch {
      toast.error('Kunde inte generera feed-URL');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Synka kalender</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-3 pb-8 sm:pb-4">
          <p className="text-sm text-gray-600">
            Prenumerera på din kalender i Google Calendar, Apple Calendar eller Outlook.
          </p>
          {!feedUrl ? (
            <button
              onClick={generateFeedUrl}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Genererar...' : 'Generera iCal-URL'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <input type="text" readOnly value={feedUrl} className="w-full text-xs border rounded-lg px-3 py-2.5 bg-gray-50" />
              <button
                onClick={() => { navigator.clipboard.writeText(feedUrl); toast.success('Kopierat!'); }}
                className="w-full py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 font-medium"
              >
                Kopiera URL
              </button>
              <p className="text-xs text-gray-500">Lägg till i din kalender-app genom att prenumerera på URL:en.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
