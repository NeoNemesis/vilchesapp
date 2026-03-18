import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  CogIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Kunder', href: '/admin/customers', icon: UsersIcon },
    { name: 'Projekt', href: '/admin/projects', icon: ClipboardDocumentListIcon },
    { name: 'Offerter', href: '/admin/quotes', icon: CurrencyDollarIcon },
    { name: 'Fakturor', href: '/admin/invoices', icon: DocumentTextIcon },
    { name: 'Offertmallar', href: '/admin/quote-templates', icon: DocumentDuplicateIcon },
    { name: 'Material', href: '/admin/materials', icon: CubeIcon },
    { name: 'Kalender', href: '/admin/calendar', icon: CalendarDaysIcon },
    { name: 'Karta', href: '/admin/map', icon: MapPinIcon },
    { name: 'Rapporter', href: '/admin/reports', icon: DocumentTextIcon },
    { name: 'Personal', href: '/admin/employees', icon: UserGroupIcon },
    { name: 'Tidsrapporter', href: '/admin/time-reports', icon: ClockIcon },
    { name: 'Löneöversikt', href: '/admin/salary', icon: BanknotesIcon },
    { name: 'Underleverantörer', href: '/admin/contractors', icon: UserGroupIcon },
    { name: 'Aktivitetsloggar', href: '/admin/activity-logs', icon: ShieldCheckIcon },
    { name: 'Inställningar', href: '/admin/settings', icon: CogIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white">
          <div className="flex h-16 items-center justify-between px-6">
            <span className="text-xl font-semibold">Admin</span>
            <button onClick={() => setMobileMenuOpen(false)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="px-3 py-4 flex-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logga ut
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">VilchesApp</h1>
          </div>
          <nav className="flex-1 px-3 py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1 ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logga ut
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-white border-b border-gray-200 px-4 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">VilchesApp</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

