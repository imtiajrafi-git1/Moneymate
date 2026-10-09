import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMonthlySummary, getIncomeBreakdown, getCategoryBreakdown, isMonthlyIncomeRecord } from '../../utils/finance';
import { formatCurrency, formatMonthYear, MONTH_NAMES, formatDateLabel, formatPercent, getYearOptions } from '../../utils/formatters';
import {
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  FileText,
  Wallet,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp,
  Banknote,
  DollarSign,
  SlidersHorizontal,
  Utensils,
  Bus,
  GraduationCap,
  ShoppingBag,
  Receipt,
  Tv,
  HeartPulse,
  Home,
  PieChart,
} from 'lucide-react';

export const MonthlyView: React.FC = () => {
  const {
    incomes,
    expenses,
    universityPayments,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    settings,
    openAddModal,
    deleteExpense,
    deleteIncome,
    setActiveTab,
  } = useApp();

  const [activeSubTab, setActiveTabFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [incomeSort, setIncomeSort] = useState<'desc' | 'asc'>('desc');
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [expenseSort, setExpenseSort] = useState<'desc' | 'asc'>('desc');
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const symbol = settings?.currencySymbol ?? '৳';

  const summary = getMonthlySummary(
    incomes,
    expenses,
    universityPayments,
    selectedMonth,
    selectedYear
  );

  // Income category breakdown
  const incomeBreakdown = useMemo(() => {
    const items = getIncomeBreakdown(incomes, selectedMonth, selectedYear);
    return incomeSort === 'desc' ? items : [...items].reverse();
  }, [incomes, selectedMonth, selectedYear, incomeSort]);

  // Expense category breakdown
  const expenseBreakdown = useMemo(() => {
    const items = getCategoryBreakdown(expenses, universityPayments, selectedMonth, selectedYear);
    return expenseSort === 'desc' ? items : [...items].reverse();
  }, [expenses, universityPayments, selectedMonth, selectedYear, expenseSort]);

  // Only monthly-type incomes are listed here; semester funds live in the University wallet.
  const monthlyIncomes = incomes.filter(
    (inc) => isMonthlyIncomeRecord(inc) && inc.month === selectedMonth && inc.year === selectedYear
  );
  const monthlyExpenses = expenses.filter(
    (exp) => exp.month === selectedMonth && exp.year === selectedYear
  );

  const handleIncomeToggle = () => {
    setIsIncomeOpen((prev) => !prev);
    setIncomeSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleExpenseToggle = () => {
    setIsExpenseOpen((prev) => !prev);
    setExpenseSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const getIncomeIcon = (category: string) => {
    switch (category) {
      case 'Salary': return <Briefcase className="h-3.5 w-3.5" />;
      case 'Freelance': return <Laptop className="h-3.5 w-3.5" />;
      case 'Monthly Allowance': return <Banknote className="h-3.5 w-3.5" />;
      case 'Gift': return <Gift className="h-3.5 w-3.5" />;
      case 'Investment': return <TrendingUp className="h-3.5 w-3.5" />;
      default: return <DollarSign className="h-3.5 w-3.5" />;
    }
  };

  const getExpenseIcon = (category: string) => {
    switch (category) {
      case 'Food': return <Utensils className="h-3.5 w-3.5" />;
      case 'Transport': return <Bus className="h-3.5 w-3.5" />;
      case 'University': return <GraduationCap className="h-3.5 w-3.5" />;
      case 'Shopping': return <ShoppingBag className="h-3.5 w-3.5" />;
      case 'House Rent': return <Home className="h-3.5 w-3.5" />;
      case 'Bills': return <Receipt className="h-3.5 w-3.5" />;
      case 'Entertainment': return <Tv className="h-3.5 w-3.5" />;
      case 'Health': return <HeartPulse className="h-3.5 w-3.5" />;
      default: return <PieChart className="h-3.5 w-3.5" />;
    }
  };

  const isNegative = summary.remaining < 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Month Selector Bar */}
      <div className="mm-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">
              {formatMonthYear(selectedMonth, selectedYear)}
            </h2>
            <p className="text-xs text-slate-500">Financial Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <select
              aria-label="Select month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              aria-label="Select year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {getYearOptions(selectedYear).map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setActiveTab('reports-monthly')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Monthly Report</span>
          </button>
        </div>
      </div>

      {/* Remaining Balance — Single Prominent Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4 relative">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Remaining Balance
            </p>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              {formatMonthYear(selectedMonth, selectedYear)}
            </p>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
        </div>

        <div
          className={`text-3xl sm:text-4xl font-black tracking-tight leading-none relative ${
            isNegative ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {formatCurrency(summary.remaining, symbol)}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-4 relative">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Income</span>
            </div>
            <p className="text-base font-bold text-white">
              {formatCurrency(summary.totalIncome, symbol)}
            </p>
          </div>
          <div className="border-l border-slate-700/60 pl-4">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Expense</span>
            </div>
            <p className="text-base font-bold text-white">
              {formatCurrency(summary.totalExpense, symbol)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Category — Income breakdown */}
      <div className="mm-glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                Monthly Category
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Income · {formatMonthYear(selectedMonth, selectedYear)}
              </p>
            </div>
          </div>

          <button
            onClick={handleIncomeToggle}
            aria-label="Filter or sort income categories"
            title={incomeSort === 'desc' ? 'Sort: Highest first' : 'Sort: Lowest first'}
            className={`h-9 w-9 grid place-items-center rounded-full border transition-all active:scale-[0.96] cursor-pointer shrink-0 ${
              isIncomeOpen
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {incomeBreakdown.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No income this month</p>
            <p className="text-xs text-slate-400 mt-1">
              Add income to see the category breakdown here.
            </p>
          </div>
        ) : (
          <div className={`${isIncomeOpen ? 'block' : 'hidden xs:block'} space-y-3`}>
            {incomeBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 grid place-items-center shrink-0">
                      {getIncomeIcon(item.category)}
                    </div>
                    <span className="text-slate-800 font-bold">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(item.amount, symbol)}
                    </span>
                    <span className="text-slate-400 w-10 text-right">
                      {formatPercent(item.percentage)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Category */}
      <div className="mm-glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                Expense Category
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Expense · {formatMonthYear(selectedMonth, selectedYear)}
              </p>
            </div>
          </div>

          <button
            onClick={handleExpenseToggle}
            aria-label="Filter or sort expense categories"
            title={expenseSort === 'desc' ? 'Sort: Highest first' : 'Sort: Lowest first'}
            className={`h-9 w-9 grid place-items-center rounded-full border transition-all active:scale-[0.96] cursor-pointer shrink-0 ${
              isExpenseOpen
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {expenseBreakdown.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No expenses this month</p>
            <p className="text-xs text-slate-400 mt-1">
              Your spending categories will appear here.
            </p>
          </div>
        ) : (
          <div className={`${isExpenseOpen ? 'block' : 'hidden xs:block'} space-y-3`}>
            {expenseBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-700 border border-rose-100 grid place-items-center shrink-0">
                      {getExpenseIcon(item.category)}
                    </div>
                    <span className="text-slate-800 font-bold">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(item.amount, symbol)}
                    </span>
                    <span className="text-slate-400 w-10 text-right">
                      {formatPercent(item.percentage)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Tabbed Section */}
      <div className="mm-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setActiveTabFilter('expense')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'expense'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTabFilter('income')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Income
            </button>
          </div>

          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-2">
          {(activeSubTab === 'all' || activeSubTab === 'expense') &&
            monthlyExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{exp.title}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateLabel(exp.date)} • {exp.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">
                    - {formatCurrency(exp.amount, symbol)}
                  </span>
                  <button
                    onClick={() => deleteExpense(exp.id)}
                    aria-label={`Delete ${exp.title}`}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

          {(activeSubTab === 'all' || activeSubTab === 'income') &&
            monthlyIncomes.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{inc.title}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateLabel(inc.date)} • {inc.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600">
                    + {formatCurrency(inc.amount, symbol)}
                  </span>
                  <button
                    onClick={() => deleteIncome(inc.id)}
                    aria-label={`Delete ${inc.title}`}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

          {monthlyExpenses.length === 0 && monthlyIncomes.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No transactions recorded for {formatMonthYear(selectedMonth, selectedYear)}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
