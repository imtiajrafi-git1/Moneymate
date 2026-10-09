import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMonthlySummary, getCategoryBreakdown } from '../../utils/finance';
import { formatCurrency, formatMonthYear, MONTH_NAMES, formatPercent, getYearOptions } from '../../utils/formatters';
import { exportElementToPDF } from '../../utils/pdfExport';
import {
  Download,
  Calendar,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  FileCheck2,
  Wallet,
} from 'lucide-react';

export const MonthlyReportView: React.FC = () => {
  const {
    incomes,
    expenses,
    universityPayments,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    settings,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const summary = getMonthlySummary(
    incomes,
    expenses,
    universityPayments,
    selectedMonth,
    selectedYear
  );

  const categoryBreakdown = getCategoryBreakdown(
    expenses,
    universityPayments,
    selectedMonth,
    selectedYear
  );

  const monthlyExpenses = expenses.filter(
    (exp) => exp.month === selectedMonth && exp.year === selectedYear
  );

  const uniExpenses = monthlyExpenses.filter((e) => e.isUniversity || e.category === 'University');
  const transportExpenses = monthlyExpenses.filter((e) => e.isTransport || e.category === 'Transport');
  const otherExpenses = monthlyExpenses.filter((e) => !e.isUniversity && !e.isTransport && e.category !== 'University' && e.category !== 'Transport');

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const monthName = MONTH_NAMES[selectedMonth];
    const filename = `MoneyMate-Monthly-Report-${monthName}-${selectedYear}.pdf`;
    await exportElementToPDF(reportRef.current, filename);
    setIsExporting(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Action & Month Bar */}
      <div className="mm-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">
              Monthly Financial Report
            </h2>
            <p className="text-xs text-slate-500">
              {formatMonthYear(selectedMonth, selectedYear)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Select report month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
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
            aria-label="Download PDF Report"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Canvas Container (Exportable) */}
      <div ref={reportRef} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* MoneyMate Branded Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">MoneyMate</h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Monthly Financial Statement
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
              {formatMonthYear(selectedMonth, selectedYear)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-1 text-emerald-800 text-xs font-bold mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Total Income</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(summary.totalIncome, settings.currencySymbol)}
            </div>
          </div>

          <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-100">
            <div className="flex items-center gap-1 text-rose-800 text-xs font-bold mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Total Expense</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(summary.totalExpense, settings.currencySymbol)}
            </div>
          </div>

          <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-xs">
            <div className="text-xs text-indigo-200 font-semibold mb-1">
              Net Remaining
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatCurrency(summary.remaining, settings.currencySymbol)}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Category Breakdown</span>
            <span className="text-xs text-slate-500 font-normal">Spending Ratio</span>
          </h3>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No expense records recorded for this month.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.category} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-1.5">
                    <span>{cat.category}</span>
                    <span>
                      {formatCurrency(cat.amount, settings.currencySymbol)} ({formatPercent(cat.percentage)})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sectioned Expense Breakdown Tables */}
        <div className="space-y-4 pt-2">
          {/* University Expenses */}
          {uniExpenses.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg mb-2 inline-block">
                University Expenses
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {uniExpenses.map((e) => (
                  <div key={e.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{e.title}</div>
                      <div className="text-slate-400">{e.date}</div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatCurrency(e.amount, settings.currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transport Expenses */}
          {transportExpenses.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg mb-2 inline-block">
                Transport Expenses
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {transportExpenses.map((e) => (
                  <div key={e.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{e.title}</div>
                      <div className="text-slate-400">{e.date}</div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatCurrency(e.amount, settings.currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Expenses */}
          {otherExpenses.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mb-2 inline-block">
                General & Other Expenses
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {otherExpenses.map((e) => (
                  <div key={e.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{e.title}</div>
                      <div className="text-slate-400">{e.date} • {e.category}</div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatCurrency(e.amount, settings.currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Verified MoneyMate Personal Finance Report • All rights reserved</span>
        </div>
      </div>
    </div>
  );
};
