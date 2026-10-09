import {
  Expense,
  Income,
  UniversityPayment,
  UnifiedActivity,
  MonthlySummary,
  CategorySummary,
  YearlySummary,
  ExpenseCategory,
  SpecialFundEntry,
  SpecialWallet,
} from '../types';
import { MONTH_NAMES } from './formatters';
import { getAcademicPaidTotal } from './academic';

/**
 * "Others / Special Fund" wallet — a self-contained ledger.
 *
 *   received  = sum of all deposits
 *   spent     = sum of all spends
 *   remaining = received - spent
 *
 * It takes ONLY the special-fund entries as input, so by construction it can
 * never read from or write into the monthly / university calculations, and the
 * monthly / university calculations never see these entries.
 */
export function getWalletEntries(
  entries: SpecialFundEntry[],
  walletId: string
): SpecialFundEntry[] {
  return entries.filter((e) => e.walletId === walletId);
}

/**
 * Summary for ONE wallet. Pass only that wallet's entries (or use `walletId`).
 */
export function getWalletSummary(
  entries: SpecialFundEntry[],
  walletId: string
): { received: number; spent: number; remaining: number; history: SpecialFundEntry[] } {
  const own = getWalletEntries(entries, walletId);
  const s = getSpecialFundSummary(own);
  return { received: s.received, spent: s.spent, remaining: s.remaining, history: s.history };
}

/**
 * Totals across ALL extra wallets — used only by the dashboard overview card.
 * Still completely separate from monthly / university figures.
 */
export function getAllWalletsSummary(
  wallets: SpecialWallet[],
  entries: SpecialFundEntry[]
): {
  received: number;
  spent: number;
  remaining: number;
  walletCount: number;
  perWallet: { wallet: SpecialWallet; received: number; spent: number; remaining: number }[];
} {
  const perWallet = wallets.map((wallet) => {
    const s = getWalletSummary(entries, wallet.id);
    return { wallet, received: s.received, spent: s.spent, remaining: s.remaining };
  });
  return {
    received: perWallet.reduce((sum, w) => sum + w.received, 0),
    spent: perWallet.reduce((sum, w) => sum + w.spent, 0),
    remaining: perWallet.reduce((sum, w) => sum + w.remaining, 0),
    walletCount: wallets.length,
    perWallet,
  };
}

export function getSpecialFundSummary(entries: SpecialFundEntry[]): {
  received: number;
  spent: number;
  remaining: number;
  deposits: SpecialFundEntry[];
  spends: SpecialFundEntry[];
  history: SpecialFundEntry[];
} {
  const safe = (n: number) => (Number.isFinite(Number(n)) ? Number(n) : 0);
  const deposits = entries.filter((e) => e.kind === 'deposit');
  const spends = entries.filter((e) => e.kind === 'spend');
  const received = deposits.reduce((sum, e) => sum + safe(e.amount), 0);
  const spent = spends.reduce((sum, e) => sum + safe(e.amount), 0);
  // Newest first (date, then insertion order is preserved by stable sort)
  const history = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return { received, spent, remaining: received - spent, deposits, spends, history };
}

/**
 * Filter items by month and year
 */
export function isSameMonthYear(itemDateStr: string, month: number, year: number): boolean {
  if (!itemDateStr) return false;
  const date = new Date(itemDateStr);
  if (isNaN(date.getTime())) return false;
  return date.getMonth() === month && date.getFullYear() === year;
}

/**
 * Income type guards — the single source of truth for the monthly/semester split.
 * Legacy records without a `type` are treated as 'monthly'.
 */
export function isSemesterFund(inc: Income): boolean {
  return inc.type === 'semester';
}
export function isMonthlyIncomeRecord(inc: Income): boolean {
  return !isSemesterFund(inc);
}

/**
 * Calculate total monthly income.
 * ONLY type === 'monthly' (or legacy untyped) records count. Semester funds never do.
 */
export function getMonthlyIncome(
  incomes: Income[],
  month: number,
  year: number
): number {
  return incomes
    .filter(isMonthlyIncomeRecord)
    .filter((inc) => (inc.month !== undefined && inc.year !== undefined ? inc.month === month && inc.year === year : isSameMonthYear(inc.date, month, year)))
    .reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
}

/**
 * University Semester Fund wallet — completely independent of the monthly balance.
 *   received = sum of all income records with type === 'semester'
 *   paid     = total university payments
 *   balance  = received - paid
 */
export function getSemesterWallet(
  incomes: Income[],
  uniPayments: UniversityPayment[]
): { received: number; paid: number; balance: number; funds: Income[] } {
  const funds = incomes.filter(isSemesterFund);
  const received = funds.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const paid = uniPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return { received, paid, balance: received - paid, funds };
}

/**
 * Calculate total monthly expense.
 * NOTE: University payments are intentionally EXCLUDED from monthly totals —
 * they are tracked separately in the University section, so the Monthly card
 * reflects only regular living expenses (Food, Transport, Rent, etc.).
 */
export function getMonthlyExpense(
  expenses: Expense[],
  _uniPayments: UniversityPayment[],
  month: number,
  year: number
): number {
  return expenses
    .filter((exp) => {
      // Exclude university-tagged expenses from monthly totals
      if (exp.isUniversity || exp.category === 'University') return false;
      return exp.month !== undefined && exp.year !== undefined
        ? exp.month === month && exp.year === year
        : isSameMonthYear(exp.date, month, year);
    })
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
}

/**
 * Calculate monthly balance / remaining
 */
export function getMonthlyBalance(
  incomes: Income[],
  expenses: Expense[],
  uniPayments: UniversityPayment[],
  month: number,
  year: number
): number {
  const income = getMonthlyIncome(incomes, month, year);
  const expense = getMonthlyExpense(expenses, uniPayments, month, year);
  return income - expense;
}

/**
 * Calculate full monthly summary object
 */
export function getMonthlySummary(
  incomes: Income[],
  expenses: Expense[],
  uniPayments: UniversityPayment[],
  month: number,
  year: number
): MonthlySummary {
  const totalIncome = getMonthlyIncome(incomes, month, year);
  const totalExpense = getMonthlyExpense(expenses, uniPayments, month, year);
  const remaining = totalIncome - totalExpense;

  return {
    month,
    year,
    totalIncome,
    totalExpense,
    remaining,
  };
}

/**
 * Calculate dynamic total university paid across all records
 */
export function getUniversityTotal(
  uniPayments: UniversityPayment[],
  _expenses: Expense[] = []
): number {
  // Academic portal reads only its payment ledger. The expenses parameter stays
  // optional for backwards-compatible callers, but is deliberately never counted.
  return getAcademicPaidTotal(uniPayments);
}

/**
 * Calculate University paid for a specific semester
 */
export function getSemesterPaidTotal(
  semesterId: string,
  uniPayments: UniversityPayment[],
  _expenses: Expense[] = []
): number {
  // Semester fee progress is backed only by academic payment records.
  return getAcademicPaidTotal(uniPayments, semesterId);
}

/**
 * Get unified recent activity timeline sorted by date descending
 */
export function getRecentActivities(
  incomes: Income[],
  expenses: Expense[],
  uniPayments: UniversityPayment[],
  limit: number = 10
): UnifiedActivity[] {
  const activities: UnifiedActivity[] = [];

  // Map Incomes
  incomes.forEach((inc) => {
    const timestamp = new Date(inc.date).getTime() || Date.now();
    activities.push({
      id: inc.id,
      type: 'income',
      title: inc.title,
      amount: Number(inc.amount) || 0,
      category: inc.category || 'Income',
      date: inc.date,
      timestamp,
      note: inc.note,
    });
  });

  // Map Expenses
  expenses.forEach((exp) => {
    const timestamp = new Date(exp.date).getTime() || Date.now();
    activities.push({
      id: exp.id,
      type: exp.isUniversity || exp.category === 'University' ? 'university' : 'expense',
      title: exp.title,
      amount: Number(exp.amount) || 0,
      category: exp.category || 'Expense',
      date: exp.date,
      timestamp,
      note: exp.note,
    });
  });

  // Map Uni payments (excluding duplicates)
  uniPayments.forEach((uni) => {
    if (!expenses.some((e) => e.id === uni.id)) {
      const timestamp = new Date(uni.date).getTime() || Date.now();
      activities.push({
        id: uni.id,
        type: 'university',
        title: uni.title,
        amount: Number(uni.amount) || 0,
        category: 'University',
        date: uni.date,
        timestamp,
        note: uni.note,
      });
    }
  });

  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp - a.timestamp);

  return activities.slice(0, limit);
}

/**
 * Get Category breakdown for a given month and year
 */
export function getCategoryBreakdown(
  expenses: Expense[],
  _uniPayments: UniversityPayment[],
  month: number,
  year: number
): CategorySummary[] {
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  // Add expenses for month — excluding university (tracked separately)
  expenses
    .filter((exp) => {
      if (exp.isUniversity || exp.category === 'University') return false;
      return exp.month !== undefined && exp.year !== undefined
        ? exp.month === month && exp.year === year
        : isSameMonthYear(exp.date, month, year);
    })
    .forEach((exp) => {
      const cat = exp.category || 'Other';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += Number(exp.amount) || 0;
      categoryMap[cat].count += 1;
    });

  const totalExpense = Object.values(categoryMap).reduce((sum, item) => sum + item.amount, 0);

  const result: CategorySummary[] = Object.entries(categoryMap).map(([category, data]) => ({
    category: category as ExpenseCategory,
    amount: data.amount,
    percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    count: data.count,
  }));

  // Sort descending by amount
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Get income category breakdown for a given month and year.
 * Groups incomes by category, returns totals + percentage of monthly income.
 */
export function getIncomeBreakdown(
  incomes: Income[],
  month: number,
  year: number
): { category: string; amount: number; percentage: number; count: number }[] {
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  incomes
    .filter(isMonthlyIncomeRecord) // semester funds are excluded from monthly categories
    .filter((inc) =>
      inc.month !== undefined && inc.year !== undefined
        ? inc.month === month && inc.year === year
        : isSameMonthYear(inc.date, month, year)
    )
    .forEach((inc) => {
      const cat = inc.category || 'Other';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += Number(inc.amount) || 0;
      categoryMap[cat].count += 1;
    });

  const totalIncome = Object.values(categoryMap).reduce((sum, item) => sum + item.amount, 0);

  const result = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
    count: data.count,
  }));

  // Sort descending by amount
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Get full Yearly Summary
 */
export function getYearlySummary(
  incomes: Income[],
  expenses: Expense[],
  uniPayments: UniversityPayment[],
  year: number
): YearlySummary {
  let totalIncome = 0;
  let totalExpense = 0;

  const monthlyBreakdown = Array.from({ length: 12 }, (_, m) => {
    const inc = getMonthlyIncome(incomes, m, year);
    const exp = getMonthlyExpense(expenses, uniPayments, m, year);
    const rem = inc - exp;

    totalIncome += inc;
    totalExpense += exp;

    return {
      month: m,
      monthName: MONTH_NAMES[m],
      income: inc,
      expense: exp,
      remaining: rem,
    };
  });

  const totalRemaining = totalIncome - totalExpense;

  // Highest and Lowest Spending Months
  const monthsWithExpenses = monthlyBreakdown.filter((m) => m.expense > 0);

  let highestSpendingMonth: { monthName: string; expense: number } | null = null;
  let lowestSpendingMonth: { monthName: string; expense: number } | null = null;

  if (monthsWithExpenses.length > 0) {
    const sorted = [...monthsWithExpenses].sort((a, b) => b.expense - a.expense);
    highestSpendingMonth = {
      monthName: sorted[0].monthName,
      expense: sorted[0].expense,
    };
    lowestSpendingMonth = {
      monthName: sorted[sorted.length - 1].monthName,
      expense: sorted[sorted.length - 1].expense,
    };
  } else if (monthlyBreakdown.length > 0) {
    highestSpendingMonth = { monthName: MONTH_NAMES[0], expense: 0 };
    lowestSpendingMonth = { monthName: MONTH_NAMES[0], expense: 0 };
  }

  // Top spending category in the year
  const categoryYearMap: Record<string, number> = {};
  expenses
    .filter((exp) => !exp.isUniversity && exp.category !== 'University')
    .filter((exp) => (exp.year !== undefined ? exp.year === year : new Date(exp.date).getFullYear() === year))
    .forEach((exp) => {
      const cat = exp.category || 'Other';
      categoryYearMap[cat] = (categoryYearMap[cat] || 0) + (Number(exp.amount) || 0);
    });

  let topSpendingCategory: { category: string; amount: number } | null = null;
  const sortedCategories = Object.entries(categoryYearMap).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    topSpendingCategory = {
      category: sortedCategories[0][0],
      amount: sortedCategories[0][1],
    };
  }

  return {
    year,
    totalIncome,
    totalExpense,
    totalRemaining,
    monthlyBreakdown,
    highestSpendingMonth,
    lowestSpendingMonth,
    topSpendingCategory,
  };
}
