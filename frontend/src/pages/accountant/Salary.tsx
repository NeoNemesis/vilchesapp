import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

function formatSEK(amount: number): string {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
}

const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

const AccountantSalary: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [historyYear, setHistoryYear] = useState(now.getFullYear());

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['accountant-salary-overview', year, month],
    queryFn: async () => {
      const res = await (api as any).client.get(`/salary/admin/overview?year=${year}&month=${month}`);
      return res.data;
    },
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['accountant-salary-history', historyYear],
    queryFn: async () => {
      const res = await (api as any).client.get(`/salary/admin/history?year=${historyYear}`);
      return res.data;
    },
    enabled: activeTab === 'history',
  });

  const downloadPdf = async (id: string, name: string, weekNumber: number, pdfYear: number) => {
    try {
      const res = await (api as any).client.get(`/salary/admin/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `lonespec_${name.replace(/\s+/g, '_')}_v${weekNumber}_${pdfYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Lönespecifikation nedladdad');
    } catch {
      toast.error('Kunde inte ladda ner lönespecifikation');
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Löneunderlag</h1>
        <p className="text-sm text-gray-500 mt-1">Löneberäkningar, skatteavdrag och arbetsgivaravgifter</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Månadsöversikt
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lönehistorik
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[12rem] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={year === now.getFullYear() && month >= now.getMonth() + 1}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {loadingOverview ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : overview ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Anställda</p>
                  <p className="text-xl font-bold text-gray-900">{overview.employees.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Godkända timmar</p>
                  <p className="text-xl font-bold text-gray-900">{overview.totals.month.approvedHours.toFixed(1)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Bruttolöner</p>
                  <p className="text-xl font-bold text-gray-900">{formatSEK(overview.totals.month.grossPay)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Skatteavdrag</p>
                  <p className="text-xl font-bold text-red-600">{formatSEK(overview.totals.month.taxDeduction)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Nettolöner</p>
                  <p className="text-xl font-bold text-green-600">{formatSEK(overview.totals.month.netPay)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Arbetsgivaravgifter</p>
                  <p className="text-xl font-bold text-orange-600">{formatSEK(overview.totals.month.employerFees)}</p>
                </div>
              </div>

              {/* Total cost banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-emerald-200 text-sm">Total lönekostnad</p>
                  <p className="text-3xl font-bold">{formatSEK(overview.totals.month.totalCostEmployer)}</p>
                  <p className="text-emerald-200 text-xs mt-1">Bruttolöner + arbetsgivaravgifter (31,42%)</p>
                </div>
                <CalculatorIcon className="h-16 w-16 text-emerald-300/50" />
              </div>

              {/* Employee table */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                    Per anställd
                  </h3>
                </div>

                {/* Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anställd</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timlön</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timmar</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brutto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sem.ers.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Skatt</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Netto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Arb.avg</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total kost.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overview.employees.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatSEK(emp.hourlyRate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {emp.month.approvedHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatSEK(emp.month.grossPay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {formatSEK(emp.month.vacationPay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right">
                            {emp.month.taxDeduction > 0 ? `-${formatSEK(emp.month.taxDeduction)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                            {formatSEK(emp.month.netPay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-600 text-right">
                            {formatSEK(emp.month.employerFees)}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                            {formatSEK(emp.month.totalCostEmployer)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-sm text-gray-900">Totalt</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {overview.totals.month.approvedHours.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatSEK(overview.totals.month.grossPay)}
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right">
                          -{formatSEK(overview.totals.month.taxDeduction)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 text-right">
                          {formatSEK(overview.totals.month.netPay)}
                        </td>
                        <td className="px-4 py-3 text-sm text-orange-600 text-right">
                          {formatSEK(overview.totals.month.employerFees)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatSEK(overview.totals.month.totalCostEmployer)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {overview.employees.map((emp: any) => (
                    <div key={emp.id} className="p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">{emp.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Timmar</p>
                          <p className="font-medium">{emp.month.approvedHours.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Brutto</p>
                          <p className="font-medium">{formatSEK(emp.month.grossPay)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Netto</p>
                          <p className="font-semibold text-green-600">{formatSEK(emp.month.netPay)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Skatt</p>
                          <p className="text-red-600">{formatSEK(emp.month.taxDeduction)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Arb.avg</p>
                          <p className="text-orange-600">{formatSEK(emp.month.employerFees)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total kost.</p>
                          <p className="font-bold">{formatSEK(emp.month.totalCostEmployer)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* YTD */}
              {overview.totals.ytd.totalHours > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Ackumulerat {year}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Timmar</p>
                      <p className="text-lg font-semibold">{overview.totals.ytd.totalHours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bruttolöner</p>
                      <p className="text-lg font-semibold">{formatSEK(overview.totals.ytd.grossPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Skatt</p>
                      <p className="text-lg font-semibold text-red-600">{formatSEK(overview.totals.ytd.taxDeduction)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Nettolöner</p>
                      <p className="text-lg font-semibold text-green-600">{formatSEK(overview.totals.ytd.netPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Arbetsgivaravgifter</p>
                      <p className="text-lg font-semibold text-orange-600">{formatSEK(overview.totals.ytd.employerFees)}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {activeTab === 'history' && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setHistoryYear(y => y - 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[5rem] text-center">{historyYear}</span>
            <button
              onClick={() => setHistoryYear(y => y + 1)}
              disabled={historyYear >= now.getFullYear()}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : history?.entries?.length > 0 ? (
              <>
                {/* Totals */}
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Totalt timmar</p>
                      <p className="font-semibold">{history.totals.totalHours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bruttolöner</p>
                      <p className="font-semibold">{formatSEK(history.totals.grossPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Skatt</p>
                      <p className="font-semibold text-red-600">{formatSEK(history.totals.taxDeduction)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Nettolöner</p>
                      <p className="font-semibold text-green-600">{formatSEK(history.totals.netPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Arbetsgivaravgifter</p>
                      <p className="font-semibold text-orange-600">{formatSEK(history.totals.employerFees)}</p>
                    </div>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anställd</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timmar</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brutto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Skatt</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Arb.avg</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Netto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.entries.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.employeeName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">V{entry.weekNumber}, {entry.year}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{entry.totalHours.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatSEK(entry.grossPay)}</td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatSEK(entry.taxDeduction)}</td>
                          <td className="px-4 py-3 text-sm text-orange-600 text-right">{formatSEK(entry.employerFees)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{formatSEK(entry.netPay)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => downloadPdf(entry.id, entry.employeeName, entry.weekNumber, entry.year)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-100">
                  {history.entries.map((entry: any) => (
                    <div key={entry.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entry.employeeName}</p>
                          <p className="text-xs text-gray-500">V{entry.weekNumber}, {entry.year}</p>
                        </div>
                        <button
                          onClick={() => downloadPdf(entry.id, entry.employeeName, entry.weekNumber, entry.year)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
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
              <div className="py-16 text-center">
                <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Inga bearbetade löner för {historyYear}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountantSalary;
