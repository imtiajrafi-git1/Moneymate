import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getYearlySummary } from '../../utils/finance';
import { formatCurrency, formatPercent, getYearOptions } from '../../utils/formatters';
import { exportElementToPDF } from '../../utils/pdfExport';
import {
  Download,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  FileCheck2,
  Award,
  Wallet,
  Sparkles,
} from 'lucide-react';

export const YearlyReportView: React.FC = () => {
  const {
    incomes,
    expenses,
    universityPayments,
    selectedYear,
    setSelectedYear,
    settings,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const yearlySummary = getYearlySummary(
    incomes,
    expenses,
    universityPayments,
    selectedYear
  );

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const filename = `MoneyMate-Yearly-Report-${selectedYear}.pdf`;
    await exportElementToPDF(reportRef.current, filename);
    setIsExporting(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Year Bar */}
      <div className="mm-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">
              Yearly Financial Report
            </h2>
            <p className="text-xs text-slate-500">
              12-Month Performance ({selectedYear})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Select report year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {getYearOptions(selectedYear).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            aria-label="Download Yearly PDF Report"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download Yearly PDF</span>
          </button>
        </div>
      </div>

      {/* Exportable PDF Element */}
      <div ref={reportRef} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* MoneyMate Branded Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">MoneyMate</h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Annual Financial Performance Report
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-xs font-bold">
              Year {selectedYear}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Annual Total Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-1 text-emerald-800 text-xs font-bold mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Total Yearly Income</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(yearlySummary.totalIncome, settings.currencySymbol)}
            </div>
          </div>

          <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-100">
            <div className="flex items-center gap-1 text-rose-800 text-xs font-bold mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Total Yearly Expense</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(yearlySummary.totalExpense, settings.currencySymbol)}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs">
            <div className="text-xs text-slate-300 font-semibold mb-1">
              Total Yearly Remaining
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatCurrency(yearlySummary.totalRemaining, settings.currencySymbol)}
            </div>
          </div>
        </div>

        {/* Key Annual Insights Cards */}
        <div className="mm-stack-mobile grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Highest Spending Month */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Highest Spending Month</div>
              <div className="text-sm font-bold text-slate-900">
                {yearlySummary.highestSpendingMonth?.monthName || 'N/A'}
              </div>
              <div className="text-xs font-semibold text-rose-600">
                {formatCurrency(
                  yearlySummary.highestSpendingMonth?.expense || 0,
                  settings.currencySymbol
                )}
              </div>
            </div>
          </div>

          {/* Lowest Spending Month */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Lowest Spending Month</div>
              <div className="text-sm font-bold text-slate-900">
                {yearlySummary.lowestSpendingMonth?.monthName || 'N/A'}
              </div>
              <div className="text-xs font-semibold text-emerald-600">
                {formatCurrency(
                  yearlySummary.lowestSpendingMonth?.expense || 0,
                  settings.currencySymbol
                )}
              </div>
            </div>
          </div>

          {/* Top Spending Category */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Top Spending Category</div>
              <div className="text-sm font-bold text-slate-900">
                {yearlySummary.topSpendingCategory?.category || 'N/A'}
              </div>
              <div className="text-xs font-semibold text-indigo-600">
                {formatCurrency(
                  yearlySummary.topSpendingCategory?.amount || 0,
                  settings.currencySymbol
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 12-Month Breakdown Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Monthly Financial Breakdown ({selectedYear})
          </h3>

          <div className="mm-scroll-x overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Income</th>
                  <th className="py-2.5 px-3">Expense</th>
                  <th className="py-2.5 px-3">Remaining</th>
                  <th className="py-2.5 px-3 text-right">Saving Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlySummary.monthlyBreakdown.map((m) => {
                  const savingRatio = m.income > 0 ? (m.remaining / m.income) * 100 : 0;
                  return (
                    <tr key={m.month} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.monthName}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">
                        {formatCurrency(m.income, settings.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 font-semibold">
                        {formatCurrency(m.expense, settings.currencySymbol)}
                      </td>
                      <td className={`py-2.5 px-3 font-bold ${m.remaining >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatCurrency(m.remaining, settings.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-500">
                        {m.income > 0 ? formatPercent(savingRatio) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Verified MoneyMate Annual Financial Statement • All rights reserved</span>
        </div>
      </div>
    </div>
  );
};
