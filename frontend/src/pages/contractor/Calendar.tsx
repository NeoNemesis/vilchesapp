import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useBasePath } from '../../hooks/useBasePath';
import { Project } from '../../types';
import { Link } from 'react-router-dom';

const Calendar: React.FC = () => {
  const basePath = useBasePath();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: async () => {
      try {
        const response = await api.getMyProjects();

        // Hantera olika responseformat
        if (Array.isArray(response)) {
          return response;
        } else if (response?.data && Array.isArray(response.data)) {
          return response.data;
        } else if (response?.projects && Array.isArray(response.projects)) {
          return response.projects;
        } else {
          console.warn('Okänt API-format, returnerar tom array:', response);
          return [];
        }
      } catch (error: any) {
        console.error('API Error:', error);
        // Returnera tom array istället för att kasta fel
        return [];
      }
    },
    retry: 1,
    staleTime: 30000, // Cache i 30 sekunder
    refetchOnWindowFocus: false
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getProjectsForDate = (date: Date) => {
    // Säkerställ att projects är en array innan vi filtrerar
    if (!Array.isArray(projects)) {
      console.warn('Projects är inte en array:', projects);
      return [];
    }
    
    return projects.filter((project: Project) => {
      if (!project || !project.deadline) return false;
      try {
        return isSameDay(parseISO(project.deadline), date);
      } catch (error) {
        console.warn('Fel vid parsning av datum:', project.deadline, error);
        return false;
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'NORMAL': return 'bg-blue-500 text-white';
      case 'LOW': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projektkalender</h1>
                <p className="text-gray-600">Översikt över dina projekt och deadlines</p>
              </div>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: sv })}
              </h2>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'].map((day) => (
            <div key={day} className="px-3 py-2 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {monthDays.map((day, dayIndex) => {
            const dayProjects = getProjectsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isCurrentDay ? 'bg-blue-50' : ''}`}
              >
                {/* Date Number */}
                <div className={`text-sm font-medium mb-2 ${
                  !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
                } ${isCurrentDay ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                  {isCurrentDay && (
                    <span className="ml-1 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>

                {/* Projects for this day */}
                <div className="space-y-1">
                  {dayProjects.slice(0, 2).map((project: Project) => (
                    <Link
                      key={project.id}
                      to={`${basePath}/projects/${project.id}`}
                      className="block"
                    >
                      <div className={`text-xs p-1 rounded truncate hover:opacity-80 transition-opacity ${
                        getPriorityColor(project.priority)
                      }`}>
                        <div className="flex items-center space-x-1">
                          {project.priority === 'URGENT' && (
                            <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{project.title}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {dayProjects.length > 2 && (
                    <div className="text-xs text-gray-500 p-1">
                      +{dayProjects.length - 2} fler
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Förklaring</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Brådskande</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-700">Hög prioritet</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-sm text-gray-700">Låg prioritet</span>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Kommande deadlines</h3>
        </div>
        <div className="p-6">
          {projects
            .filter((project: Project) => project.deadline)
            .sort((a: Project, b: Project) => 
              new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
            )
            .slice(0, 5)
            .map((project: Project) => (
              <Link
                key={project.id}
                to={`${basePath}/projects/${project.id}`}
                className="block hover:bg-gray-50 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      project.priority === 'URGENT' ? 'bg-red-500' :
                      project.priority === 'HIGH' ? 'bg-orange-500' :
                      project.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500 flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{project.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {format(parseISO(project.deadline!), 'd MMM', { locale: sv })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(project.deadline!), 'yyyy')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;

