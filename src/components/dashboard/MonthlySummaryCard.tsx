import React, { useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { getMonthlySummary, isMonthlyIncomeRecord } from '../../utils/finance';
import { formatCurrency, formatMonthYear, MONTH_NAMES, getYearOptions } from '../../utils/formatters';
import { Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const MonthlySummaryCard: React.FC = () => {
  const {
    incomes,
    expenses,
    universityPayments,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    settings,
    setActiveTab,
  } = useApp();

  const summary = useMemo(
    () => getMonthlySummary(incomes, expenses, universityPayments, selectedMonth, selectedYear),
    [incomes, expenses, universityPayments, selectedMonth, selectedYear]
  );

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const symbol = settings?.currencySymbol ?? '৳';
  const isNegative = summary.remaining < 0;
  const entryCount = incomes.filter(isMonthlyIncomeRecord).length + expenses.length;

  return (
    <button
      onClick={() => setActiveTab('monthly')}
      aria-label={`Open Monthly management for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
      className="group text-left w-full bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] rounded-[16px] xs:rounded-[18px] p-3 xs:p-4 relative overflow-hidden cursor-pointer shadow-md border border-white/5 transition-all hover:shadow-lg"
    >
      {/* Glow accents */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 bg-[#8C7C91]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-28 w-28 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5 xs:mb-3 relative">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full bg-[#10B981] shrink-0 animate-pulse shadow-[0_0_9px_rgba(16,185,129,0.7)]" />
            <p className="font-sans text-[11px] xs:text-[12px] font-black uppercase tracking-[0.11em] text-[#9A8F9E] leading-none">
              Money Overview
            </p>
          </div>
          <h2 className="mt-1.5 font-sans text-[14px] xs:text-[17px] font-extrabold tracking-tight text-white leading-none">
            {formatMonthYear(selectedMonth, selectedYear)}
          </h2>
        </div>

        {/* Date picker */}
        <div
          onClick={stop}
          className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-2 xs:px-2.5 py-1"
        >
          <Calendar className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-[#9A8F9E] shrink-0" />
          <select
            aria-label="Select month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="cursor-pointer bg-transparent font-sans text-[11px] xs:text-[12px] font-bold text-[#E8DFEC] focus:outline-none [&>option]:text-[#211A28]"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>{name.slice(0, 3)}</option>
            ))}
          </select>
          <span className="text-[#9A8F9E] text-[10px] font-bold">·</span>
          <select
            aria-label="Select year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="cursor-pointer bg-transparent font-sans text-[11px] xs:text-[12px] font-bold text-[#E8DFEC] focus:outline-none [&>option]:text-[#211A28]"
          >
            {getYearOptions(selectedYear).map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Remaining */}
      <div className="rounded-[12px] xs:rounded-[14px] bg-white/[0.04] border border-white/10 px-3 py-3 xs:px-3.5 xs:py-3.5 relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-[10px] xs:text-[11px] font-bold uppercase tracking-[0.08em] text-[#9A8F9E]">
            Remaining
          </span>
          <span
            className={`font-sans text-[19px] xs:text-[25px] font-black tracking-tight leading-none ${
              isNegative ? 'text-[#FB7185]' : 'text-white'
            }`}
          >
            {formatCurrency(summary.remaining, symbol)}
          </span>
        </div>

        {/* Hairline */}
        <div className="my-2.5 h-px bg-white/10" />

        {/* Income / Expense */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#9A8F9E] shrink-0" />
              <span className="font-sans text-[11px] xs:text-[12px] font-bold text-[#9A8F9E] truncate">Income</span>
            </div>
            <span className="font-sans text-[12px] xs:text-[13.5px] font-black tracking-tight text-[#34D399] truncate">
              {formatCurrency(summary.totalIncome, symbol)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ArrowDownLeft className="h-3.5 w-3.5 text-[#9A8F9E] shrink-0" />
              <span className="font-sans text-[11px] xs:text-[12px] font-bold text-[#9A8F9E] truncate">Expense</span>
            </div>
            <span className="font-sans text-[12px] xs:text-[13.5px] font-black tracking-tight text-[#FB7185] truncate">
              {formatCurrency(summary.totalExpense, symbol)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between relative">
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-[#9A8F9E]/70">
          {entryCount === 0 ? 'No entries this month' : `${entryCount} entries`}
        </span>
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-white opacity-70 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </button>
  );
};
