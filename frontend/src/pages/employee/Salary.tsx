import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

function formatSEK(amount: number): string {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
}

const EmployeeSalary: React.FC = () => {
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  // Fetch current month provisional salary
  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: ['salary', 'current'],
    queryFn: async () => {
      const res = await (api as any).client.get('/salary/my/current');
      return res.data;
    },
  });

  // Fetch salary history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['salary', 'history', historyYear],
    queryFn: async () => {
      const res = await (api as any).client.get(`/salary/my/history?year=${historyYear}`);
      return res.data;
    },
  });

  const downloadPdf = async (id: string, weekNumber: number, year: number) => {
    try {
      const res = await (api as any).client.get(`/salary/my/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `lonespec_v${weekNumber}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Lönespecifikation nedladdad');
    } catch {
      toast.error('Kunde inte ladda ner lönespecifikation');
    }
  };

  const downloadProvisionalPdf = async () => {
    try {
      const res = await (api as any).client.get('/salary/my/provisional-pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `provisorisk_lonespec_${current?.period?.monthName}_${current?.period?.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Provisorisk lönespecifikation nedladdad');
    } catch {
      toast.error('Kunde inte ladda ner provisorisk lönespecifikation');
    }
  };

  if (loadingCurrent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (current && !current.hasRate) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Timlön ej konfigurerad</h2>
          <p className="text-yellow-700">{current.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Min lön</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provisorisk löneberäkning baserad på godkända tidrapporter
        </p>
      </div>

      {/* Current month overview */}
      {current && (
        <>
          {/* Period header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm">Pågående period</p>
                <h2 className="text-2xl font-bold capitalize">
                  {current.period.monthName} {current.period.year}
                </h2>
              </div>
              <div className="bg-blue-500/30 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium">Provisorisk</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-blue-200 text-xs">Timlön</p>
                <p className="text-lg font-semibold">{formatSEK(current.hourlyRate)}/tim</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Semesterersättning</p>
                <p className="text-lg font-semibold">{current.vacationPayPercent}%</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Godkända timmar</p>
                <p className="text-lg font-semibold">{current.approved.hours.toFixed(1)} tim</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Väntande timmar</p>
                <p className="text-lg font-semibold">{current.pending.hours.toFixed(1)} tim</p>
              </div>
            </div>
          </div>

          {/* Salary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Approved salary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BanknotesIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Godkänd bruttolön</p>
                  <p className="text-xl font-bold text-gray-900">{formatSEK(current.approved.grossPay)}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Grundlön</span>
                  <span className="text-gray-900">{formatSEK(current.approved.hours * current.hourlyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Semesterersättning</span>
                  <span className="text-gray-900">{formatSEK(current.approved.vacationPay)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between">
                  <span className="text-gray-500">Skatteavdrag</span>
                  <span className="text-red-600">-{formatSEK(current.approved.taxDeduction)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-semibold">
                  <span className="text-gray-700">Nettolön</span>
                  <span className="text-green-600">{formatSEK(current.approved.netPay)}</span>
                </div>
              </div>
            </div>

            {/* Projected salary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Beräknad total (inkl. väntande)</p>
                  <p className="text-xl font-bold text-gray-900">{formatSEK(current.projected.grossPay)}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Totala timmar</span>
                  <span className="text-gray-900">{current.projected.hours.toFixed(1)} tim</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Skatteavdrag</span>
                  <span className="text-red-600">-{formatSEK(current.projected.taxDeduction)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-semibold">
                  <span className="text-gray-700">Beräknad nettolön</span>
                  <span className="text-blue-600">{formatSEK(current.projected.netPay)}</span>
                </div>
              </div>
            </div>

            {/* Hours breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Timmar denna månad</p>
                  <p className="text-xl font-bold text-gray-900">{current.projected.hours.toFixed(1)} tim</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Godkända</span>
                  </div>
                  <span className="font-medium">{current.approved.hours.toFixed(1)} tim ({current.approved.weeks} v)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600">Inskickade</span>
                  </div>
                  <span className="font-medium">{current.pending.hours.toFixed(1)} tim ({current.pending.weeks} v)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-gray-600">Utkast</span>
                  </div>
                  <span className="font-medium">{current.draft.hours.toFixed(1)} tim ({current.draft.weeks} v)</span>
                </div>
              </div>
              {current.approved.hours > 0 && (
                <button
                  onClick={downloadProvisionalPdf}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Ladda ner provisorisk spec
                </button>
              )}
            </div>
          </div>

          {/* YTD summary */}
          {current.ytd.totalHours > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Ackumulerat {current.period.year}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Timmar</p>
                  <p className="text-lg font-semibold text-gray-900">{current.ytd.totalHours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Bruttolön</p>
                  <p className="text-lg font-semibold text-gray-900">{formatSEK(current.ytd.grossPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Skatt</p>
                  <p className="text-lg font-semibold text-red-600">{formatSEK(current.ytd.taxDeduction)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Semesterersättning</p>
                  <p className="text-lg font-semibold text-gray-900">{formatSEK(current.ytd.vacationPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Nettolön</p>
                  <p className="text-lg font-semibold text-green-600">{formatSEK(current.ytd.netPay)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Salary history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lönehistorik</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[4rem] text-center">
              {historyYear}
            </span>
            <button
              onClick={() => setHistoryYear((y) => y + 1)}
              disabled={historyYear >= new Date().getFullYear()}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : history?.entries?.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timmar</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timlön</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brutto</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Skatt</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Netto</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.entries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-900">
                        Vecka {entry.weekNumber}, {entry.year}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 text-right">
                        {entry.totalHours.toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 text-right">
                        {formatSEK(entry.hourlyRate)}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatSEK(entry.grossPay)}
                      </td>
                      <td className="px-5 py-3 text-sm text-red-600 text-right">
                        -{formatSEK(entry.taxDeduction)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-green-600 text-right">
                        {formatSEK(entry.netPay)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => downloadPdf(entry.id, entry.weekNumber, entry.year)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {history.totals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-3 text-sm text-gray-900">Totalt {historyYear}</td>
                      <td className="px-5 py-3 text-sm text-gray-900 text-right">
                        {history.totals.totalHours.toFixed(1)}
                      </td>
                      <td className="px-5 py-3"></td>
                      <td className="px-5 py-3 text-sm text-gray-900 text-right">
                        {formatSEK(history.totals.grossPay)}
                      </td>
                      <td className="px-5 py-3 text-sm text-red-600 text-right">
                        -{formatSEK(history.totals.taxDeduction)}
                      </td>
                      <td className="px-5 py-3 text-sm text-green-600 text-right">
                        {formatSEK(history.totals.netPay)}
                      </td>
                      <td className="px-5 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {history.entries.map((entry: any) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Vecka {entry.weekNumber}, {entry.year}
                    </span>
                    <button
                      onClick={() => downloadPdf(entry.id, entry.weekNumber, entry.year)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Timmar</p>
                      <p className="font-medium">{entry.totalHours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Brutto</p>
                      <p className="font-medium">{formatSEK(entry.grossPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Netto</p>
                      <p className="font-semibold text-green-600">{formatSEK(entry.netPay)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Inga lönespecifikationer för {historyYear}</p>
            <p className="text-xs text-gray-400 mt-1">
              Lönespecifikationer skapas när tidrapporter bearbetas av arbetsgivaren
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSalary;
