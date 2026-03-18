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
  addWeeks,
  subWeeks,
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
  TrashIcon,
  PencilIcon,
  LinkIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import type { CalendarEvent, CreateCalendarEventRequest, CalendarEventType } from '../../types';

type ViewMode = 'month' | 'week' | 'day';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  MEETING: 'Möte',
  SITE_VISIT: 'Platsbesök',
  DEADLINE: 'Deadline',
  TASK: 'Uppgift',
  REMINDER: 'Påminnelse',
  BLOCKED: 'Blockerad tid',
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

const AdminCalendar: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Beräkna datum-range baserat på vy
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 1 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
      };
    } else if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      };
    }
  }, [currentDate, viewMode]);

  // Hämta händelser
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', dateRange.start.toISOString(), dateRange.end.toISOString(), filterUser, filterType],
    queryFn: () =>
      api.getCalendarEvents({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        userId: filterUser || undefined,
        type: filterType || undefined,
      }),
  });

  // Hämta användare för filtrering och tilldelning
  const { data: users = [] } = useQuery({
    queryKey: ['calendar-users'],
    queryFn: () => api.getCalendarUsers(),
  });

  // Hämta projekt för koppling
  const { data: projects = [] } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: () => api.getAllProjects(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateCalendarEventRequest) => api.createCalendarEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Händelse skapad');
      setShowEventModal(false);
    },
    onError: () => toast.error('Kunde inte skapa händelse'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCalendarEventRequest> }) =>
      api.updateCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Händelse uppdaterad');
      setShowEventModal(false);
      setSelectedEvent(null);
    },
    onError: () => toast.error('Kunde inte uppdatera händelse'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Händelse borttagen');
      setShowDetailModal(false);
      setSelectedEvent(null);
    },
    onError: () => toast.error('Kunde inte ta bort händelse'),
  });

  // Navigation
  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      const fn = direction === 'next'
        ? viewMode === 'month' ? addMonths : viewMode === 'week' ? addWeeks : (d: Date, n: number) => { const nd = new Date(d); nd.setDate(d.getDate() + n); return nd; }
        : viewMode === 'month' ? subMonths : viewMode === 'week' ? subWeeks : (d: Date, n: number) => { const nd = new Date(d); nd.setDate(d.getDate() - n); return nd; };
      setCurrentDate(fn(currentDate, 1));
    },
    [currentDate, viewMode]
  );

  const goToToday = () => setCurrentDate(new Date());

  // Hämta händelser för ett specifikt datum
  const getEventsForDate = useCallback(
    (date: Date) =>
      events.filter((e: CalendarEvent) => {
        const start = parseISO(e.startTime);
        const end = parseISO(e.endTime);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        return start <= dayEnd && end >= dayStart;
      }),
    [events]
  );

  // Dagar att visa i kalendern
  const calendarDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange, viewMode, currentDate]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleEditEvent = () => {
    setShowDetailModal(false);
    setShowEventModal(true);
  };

  // Title baserat på vy
  const viewTitle = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: sv });
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: sv })} – ${format(weekEnd, 'd MMM yyyy', { locale: sv })}`;
    }
    return format(currentDate, 'EEEE d MMMM yyyy', { locale: sv });
  }, [currentDate, viewMode]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-4">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className="h-7 w-7 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kalender</h1>
                <p className="text-sm text-gray-500">Boka möten, hantera personal & synka</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Vy-växlare */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === mode ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode === 'month' ? 'Månad' : mode === 'week' ? 'Vecka' : 'Dag'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Filter"
              >
                <FunnelIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setShowSyncModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                title="Synkronisera"
              >
                <LinkIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setShowEventModal(true); }}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Ny händelse</span>
              </button>
            </div>
          </div>

          {/* Navigering */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button onClick={goToToday} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Idag
              </button>
              <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">{viewTitle}</h2>
            <div className="text-sm text-gray-500">{events.length} händelser</div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200">
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">Alla användare</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">Alla typer</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {(filterUser || filterType) && (
                <button
                  onClick={() => { setFilterUser(''); setFilterType(''); }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Rensa filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'month' ? (
        <MonthView
          days={calendarDays}
          currentDate={currentDate}
          getEventsForDate={getEventsForDate}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      ) : viewMode === 'week' ? (
        <WeekView
          days={calendarDays}
          getEventsForDate={getEventsForDate}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      ) : (
        <DayView
          date={currentDate}
          events={getEventsForDate(currentDate)}
          onEventClick={handleEventClick}
          onTimeClick={handleDayClick}
        />
      )}

      {/* Upcoming sidebar */}
      <div className="mt-4 bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Kommande händelser</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {events
            .filter((e: CalendarEvent) => parseISO(e.startTime) >= new Date() && e.status !== 'CANCELLED')
            .slice(0, 8)
            .map((event: CalendarEvent) => (
              <div
                key={event.id}
                onClick={(e) => handleEventClick(event, e)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${EVENT_TYPE_COLORS[event.type]}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(parseISO(event.startTime), 'd MMM HH:mm', { locale: sv })}
                    {event.participants.length > 0 && ` · ${event.participants.length} deltagare`}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
              </div>
            ))}
          {events.filter((e: CalendarEvent) => parseISO(e.startTime) >= new Date()).length === 0 && (
            <p className="text-sm text-gray-500">Inga kommande händelser</p>
          )}
        </div>
      </div>

      {/* Förklaring */}
      <div className="mt-4 bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Händelsetyper</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-1.5">
              <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[key as CalendarEventType]}`} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Create/Edit Modal */}
      {showEventModal && (
        <EventFormModal
          event={selectedEvent}
          defaultDate={selectedDate}
          users={users}
          projects={projects}
          onSubmit={(data) => {
            if (selectedEvent) {
              updateMutation.mutate({ id: selectedEvent.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={() => { setShowEventModal(false); setSelectedEvent(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Event Detail Modal */}
      {showDetailModal && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => { setShowDetailModal(false); setSelectedEvent(null); }}
          onEdit={handleEditEvent}
          onDelete={() => deleteMutation.mutate(selectedEvent.id)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <SyncModal onClose={() => setShowSyncModal(false)} />
      )}
    </div>
  );
};

// === MONTH VIEW ===
const MonthView: React.FC<{
  days: Date[];
  currentDate: Date;
  getEventsForDate: (date: Date) => CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}> = ({ days, currentDate, getEventsForDate, onDayClick, onEventClick }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    <div className="grid grid-cols-7 bg-gray-50">
      {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => (
        <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200 last:border-r-0">
          {day}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const dayEvents = getEventsForDate(day);
        const inMonth = isSameMonth(day, currentDate);
        const today = isToday(day);

        return (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`min-h-[80px] sm:min-h-[110px] p-1.5 border-r border-b border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors ${
              !inMonth ? 'bg-gray-50/50' : ''
            } ${today ? 'bg-blue-50/50' : ''}`}
          >
            <div className={`text-xs font-medium mb-1 ${!inMonth ? 'text-gray-400' : 'text-gray-700'} ${today ? 'text-blue-600 font-bold' : ''}`}>
              <span className={today ? 'bg-blue-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px]' : ''}>
                {format(day, 'd')}
              </span>
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
                <div
                  key={event.id}
                  onClick={(e) => onEventClick(event, e)}
                  className={`text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 transition-opacity ${
                    event.color ? '' : EVENT_TYPE_COLORS[event.type]
                  }`}
                  style={event.color ? { backgroundColor: event.color } : undefined}
                  title={event.title}
                >
                  {!event.allDay && format(parseISO(event.startTime), 'HH:mm') + ' '}{event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} fler</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// === WEEK VIEW ===
const WeekView: React.FC<{
  days: Date[];
  getEventsForDate: (date: Date) => CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}> = ({ days, getEventsForDate, onDayClick, onEventClick }) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header med dagar */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-gray-50 border-b border-gray-200">
        <div className="p-2 text-xs text-gray-500">Tid</div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-l border-gray-200 ${isToday(day) ? 'bg-blue-50' : ''}`}
          >
            <div className="text-xs text-gray-500">{format(day, 'EEE', { locale: sv })}</div>
            <div className={`text-sm font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Tid-grid */}
      <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
            <div className="p-1 text-[10px] text-gray-400 text-right pr-2">{String(hour).padStart(2, '0')}:00</div>
            {days.map((day) => {
              const dayEvents = getEventsForDate(day).filter((e: CalendarEvent) => {
                const startHour = parseISO(e.startTime).getHours();
                return startHour === hour;
              });

              return (
                <div
                  key={day.toISOString() + hour}
                  onClick={() => onDayClick(day)}
                  className="min-h-[48px] border-l border-gray-200 p-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {dayEvents.map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className={`text-[10px] px-1 py-0.5 rounded text-white mb-0.5 cursor-pointer hover:opacity-80 truncate ${
                        event.color ? '' : EVENT_TYPE_COLORS[event.type]
                      }`}
                      style={event.color ? { backgroundColor: event.color } : undefined}
                    >
                      {format(parseISO(event.startTime), 'HH:mm')} {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// === DAY VIEW ===
const DayView: React.FC<{
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  onTimeClick: (date: Date) => void;
}> = ({ date, events, onEventClick, onTimeClick }) => {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 - 21:00

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = events.filter((e) => {
            const startHour = parseISO(e.startTime).getHours();
            const endHour = parseISO(e.endTime).getHours();
            return hour >= startHour && hour < endHour;
          });

          return (
            <div
              key={hour}
              onClick={() => onTimeClick(date)}
              className="flex border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="w-16 p-2 text-xs text-gray-400 text-right flex-shrink-0">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 min-h-[56px] p-1 space-y-1">
                {hourEvents
                  .filter((e) => parseISO(e.startTime).getHours() === hour)
                  .map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className={`p-2 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                        event.color ? '' : EVENT_TYPE_COLORS[event.type]
                      }`}
                      style={event.color ? { backgroundColor: event.color } : undefined}
                    >
                      <div className="text-sm font-medium">{event.title}</div>
                      <div className="text-xs opacity-90">
                        {format(parseISO(event.startTime), 'HH:mm')} – {format(parseISO(event.endTime), 'HH:mm')}
                        {event.location && ` · ${event.location}`}
                      </div>
                      {event.participants.length > 0 && (
                        <div className="text-xs opacity-80 mt-0.5">
                          {event.participants.map((p) => p.user.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// === EVENT FORM MODAL ===
const EventFormModal: React.FC<{
  event: CalendarEvent | null;
  defaultDate: Date | null;
  users: any[];
  projects: any[];
  onSubmit: (data: CreateCalendarEventRequest) => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ event, defaultDate, users, projects, onSubmit, onClose, isLoading }) => {
  const defaultStart = defaultDate || new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // +1h

  const [form, setForm] = useState<CreateCalendarEventRequest>({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    startTime: event?.startTime || format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
    endTime: event?.endTime || format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
    allDay: event?.allDay || false,
    type: event?.type || 'MEETING',
    status: event?.status || 'CONFIRMED',
    color: event?.color || '',
    recurrence: event?.recurrence || 'NONE',
    projectId: event?.projectId || '',
    participantIds: event?.participants?.map((p) => p.userId) || [],
    notes: event?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      projectId: form.projectId || undefined,
      color: form.color || undefined,
    };
    onSubmit(submitData);
  };

  const toggleParticipant = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds?.includes(userId)
        ? prev.participantIds.filter((id) => id !== userId)
        : [...(prev.participantIds || []), userId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? 'Redigera händelse' : 'Ny händelse'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="T.ex. Kundmöte med Andersson"
            />
          </div>

          {/* Typ & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="CONFIRMED">Bekräftad</option>
                <option value="TENTATIVE">Preliminär</option>
                <option value="CANCELLED">Avbokad</option>
              </select>
            </div>
          </div>

          {/* Heldagsval */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Heldag</span>
          </label>

          {/* Datum/Tid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start *</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                required
                value={form.allDay ? form.startTime.slice(0, 10) : form.startTime.slice(0, 16)}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slut *</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                required
                value={form.allDay ? form.endTime.slice(0, 10) : form.endTime.slice(0, 16)}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Plats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plats</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="T.ex. Bromma, Storgatan 15"
            />
          </div>

          {/* Beskrivning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Detaljer om händelsen..."
            />
          </div>

          {/* Återkommande */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Återkommande</label>
            <select
              value={form.recurrence}
              onChange={(e) => setForm({ ...form, recurrence: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="NONE">Ingen upprepning</option>
              <option value="DAILY">Dagligen</option>
              <option value="WEEKLY">Varje vecka</option>
              <option value="BIWEEKLY">Varannan vecka</option>
              <option value="MONTHLY">Varje månad</option>
              <option value="YEARLY">Varje år</option>
            </select>
          </div>

          {/* Projekt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kopplat projekt</label>
            <select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Inget projekt</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Deltagare */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deltagare ({form.participantIds?.length || 0})
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
              {users.map((user: any) => (
                <label key={user.id} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.participantIds?.includes(user.id) || false}
                    onChange={() => toggleParticipant(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="text-xs text-gray-400">({user.role})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Färg */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Färg (valfritt)</label>
            <input
              type="color"
              value={form.color || '#3b82f6'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>

          {/* Anteckningar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Interna anteckningar..."
            />
          </div>

          {/* Knappar */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sparar...' : event ? 'Uppdatera' : 'Skapa händelse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// === EVENT DETAIL MODAL ===
const EventDetailModal: React.FC<{
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ event, onClose, onEdit, onDelete, isDeleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
      <div
        className={`p-4 rounded-t-xl text-white ${event.color ? '' : EVENT_TYPE_COLORS[event.type]}`}
        style={event.color ? { backgroundColor: event.color } : undefined}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium opacity-90">{EVENT_TYPE_LABELS[event.type]}</span>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <h2 className="text-lg font-bold mt-1">{event.title}</h2>
        {event.status === 'CANCELLED' && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-red-600 rounded text-xs">AVBOKAD</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Datum/tid */}
        <div className="flex items-start space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            {event.allDay
              ? format(parseISO(event.startTime), 'd MMMM yyyy', { locale: sv })
              : `${format(parseISO(event.startTime), 'd MMM HH:mm', { locale: sv })} – ${format(parseISO(event.endTime), 'HH:mm', { locale: sv })}`
            }
          </div>
        </div>

        {/* Plats */}
        {event.location && (
          <div className="flex items-start space-x-2">
            <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{event.location}</span>
          </div>
        )}

        {/* Deltagare */}
        {event.participants.length > 0 && (
          <div className="flex items-start space-x-2">
            <UserGroupIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              {event.participants.map((p) => (
                <span key={p.id} className="inline-block mr-2">
                  {p.user.name}
                  <span className={`ml-1 text-xs ${p.accepted ? 'text-green-600' : 'text-gray-400'}`}>
                    ({p.accepted ? 'Accepterat' : 'Väntar'})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Beskrivning */}
        {event.description && (
          <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{event.description}</div>
        )}

        {/* Projekt */}
        {event.project && (
          <div className="text-sm">
            <span className="text-gray-500">Projekt: </span>
            <span className="text-blue-600 font-medium">{event.project.title}</span>
          </div>
        )}

        {/* Skapad av */}
        {event.createdBy && (
          <div className="text-xs text-gray-400">
            Skapad av {event.createdBy.name} · {format(parseISO(event.createdAt), 'd MMM yyyy', { locale: sv })}
          </div>
        )}

        {/* Knappar */}
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{isDeleting ? 'Tar bort...' : 'Ta bort'}</span>
          </button>
          <button
            onClick={onEdit}
            className="flex items-center space-x-1 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Redigera</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

// === SYNC MODAL ===
const SyncModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('URL kopierad!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Synkronisera kalender</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Prenumerera på din VilchesApp-kalender i Google Calendar, Apple Calendar, Outlook eller annan kalender-app.
          </p>

          <div className="bg-blue-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Så gör du:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Klicka "Generera URL" nedan</li>
              <li>Kopiera URL:en</li>
              <li>I Google Calendar: "Andra kalendrar" &rarr; "Från URL"</li>
              <li>Klistra in URL:en</li>
            </ol>
          </div>

          {!feedUrl ? (
            <button
              onClick={generateFeedUrl}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Genererar...' : 'Generera iCal-URL'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={feedUrl}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                />
                <button
                  onClick={copyUrl}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {copied ? 'Kopierat!' : 'Kopiera'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Denna URL uppdateras automatiskt. Dela den inte med andra.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
