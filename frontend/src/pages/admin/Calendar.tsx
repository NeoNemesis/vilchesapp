import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  address: string;
  deadline?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
}

const AdminCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: () => api.getAllProjects()
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getProjectsForDate = (date: Date) => {
    return projects.filter((project: Project) => {
      if (!project.deadline) return false;
      return isSameDay(parseISO(project.deadline), date);
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

  // Filter projects with deadlines for upcoming list
  const upcomingProjects = projects
    .filter((project: Project) => project.deadline)
    .sort((a: Project, b: Project) => 
      new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    )
    .slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projektkalender - Admin</h1>
                <p className="text-gray-600">Översikt över alla projekt och deadlines</p>
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
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
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
                className={`min-h-[140px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
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
                  {dayProjects.slice(0, 3).map((project: Project) => (
                    <Link
                      key={project.id}
                      to={`/admin/projects/${project.id}`}
                      className="block"
                    >
                      <div className={`text-xs p-1 rounded transition-opacity hover:opacity-80 ${
                        getPriorityColor(project.priority)
                      }`}>
                        <div className="flex items-center space-x-1 mb-1">
                          {project.priority === 'URGENT' && (
                            <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate font-medium">{project.title}</span>
                        </div>
                        {project.assignedTo && (
                          <div className="flex items-center space-x-1 text-xs opacity-90">
                            <UserIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{project.assignedTo.name}</span>
                          </div>
                        )}
                        <div className={`inline-block px-1 py-0.5 rounded text-xs mt-1 ${getStatusColor(project.status)}`}>
                          {project.status}
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {dayProjects.length > 3 && (
                    <div className="text-xs text-gray-500 p-1">
                      +{dayProjects.length - 3} fler
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics and Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Projektstatistik</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {projects.filter((p: Project) => p.status === 'PENDING').length}
                </div>
                <div className="text-sm text-gray-500">Väntande</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {projects.filter((p: Project) => p.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-sm text-gray-500">Pågående</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {projects.filter((p: Project) => p.priority === 'URGENT').length}
                </div>
                <div className="text-sm text-gray-500">Brådskande</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {projects.filter((p: Project) => p.deadline).length}
                </div>
                <div className="text-sm text-gray-500">Med deadline</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Kommande deadlines</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {upcomingProjects.map((project: Project) => (
                <Link
                  key={project.id}
                  to={`/admin/projects/${project.id}`}
                  className="block hover:bg-gray-50 rounded-lg p-3 transition-colors border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        project.priority === 'URGENT' ? 'bg-red-500' :
                        project.priority === 'HIGH' ? 'bg-orange-500' :
                        project.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}></div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{project.title}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                        {project.assignedTo && (
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{project.assignedTo.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {format(parseISO(project.deadline!), 'd MMM', { locale: sv })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(project.deadline!), 'yyyy')}
                      </div>
                      <div className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getStatusColor(project.status)}`}>
                        {project.status}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Förklaring</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm text-gray-700">Väntande</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Tilldelad</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-700">Pågående</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Klar</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-sm text-gray-700">Avbruten</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
