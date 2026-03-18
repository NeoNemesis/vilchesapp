import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';

const AccountantEmployees: React.FC = () => {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['accountant-employees'],
    queryFn: () => api.getEmployees(),
  });

  const activeEmployees = employees.filter((e: any) => e.isActive);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Anställda</h1>
        <p className="text-sm text-gray-500 mt-1">Personalinformation (skrivskyddad)</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEmployees.map((emp: any) => (
            <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.employmentType || 'Anställd'}</p>
                </div>
              </div>

              <dl className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">{emp.phone}</span>
                  </div>
                )}
                {emp.personalNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Personnr</span>
                    <span className="font-medium text-gray-900">{emp.personalNumber}</span>
                  </div>
                )}
                {emp.hourlyRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Timlön</span>
                    <span className="font-medium text-gray-900">{emp.hourlyRate} kr/h</span>
                  </div>
                )}
                {emp.vacationPayPercent != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sem.ersättning</span>
                    <span className="font-medium text-gray-900">{emp.vacationPayPercent}%</span>
                  </div>
                )}
                {emp.bankAccount && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Bankkonto</span>
                    <span className="font-medium text-gray-900">{emp.bankAccount}</span>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountantEmployees;
