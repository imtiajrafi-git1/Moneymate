export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'University'
  | 'Shopping'
  | 'Bills'
  | 'House Rent'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export type IncomeCategory =
  | 'Salary'
  | 'Freelance'
  | 'Monthly Allowance'
  | 'Gift'
  | 'Investment'
  | 'Semester Fund'
  | 'Other';

/**
 * Income type:
 *  - 'monthly'  → counts toward Monthly Overview / Remaining Balance
 *  - 'semester' → goes to the separate University Semester Fund wallet
 * Records saved before this field existed (type === undefined) are treated as 'monthly'.
 */
export type IncomeType = 'monthly' | 'semester';

export type FeeType =
  | 'Registration Fee'
  | 'Final Exam Fee'
  | 'Transport Fee'
  | 'Other Fee'
  | 'Tuition Fee'
  | 'Transport Cost'
  | 'Lab Fee'
  | 'Exam Fee'
  | 'Other';

export type AcademicFeeType = 'Registration Fee' | 'Final Exam Fee' | 'Transport Fee' | 'Other Fee';
export type PaymentMethod = 'bKash' | 'CellFin' | 'Bank' | 'Cash' | 'Other';

export interface SemesterFee {
  id: string;
  category: AcademicFeeType;
  amount: number;
  dueDate?: string;
}

export interface AcademicReceipt {
  id: string;
  paymentId: string;
  semesterId: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
  storage: 'device' | 'supabase';
  path: string;
  createdAt: string;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  type?: IncomeType; // 'monthly' (default) | 'semester'
  date: string; // YYYY-MM-DD
  month: number; // 0-11
  year: number;
  note?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  month: number; // 0-11
  year: number;
  note?: string;
  isUniversity?: boolean;
  isTransport?: boolean;
  semesterId?: string;
}

export interface UniversityPayment {
  id: string;
  title: string;
  amount: number;
  semesterId: string;
  feeType: FeeType;
  paymentMethod?: PaymentMethod;
  reference?: string;
  date: string; // YYYY-MM-DD
  month: number; // 0-11
  year: number;
  note?: string;
}

export interface Semester {
  id: string;
  name: string; // e.g. "Spring 2026", "Fall 2025"
  totalFee: number;
  status: 'Active' | 'Completed' | 'Upcoming';
  fees?: SemesterFee[];
  updatedAt?: string;
}

export type AcademicSemesterInput = Omit<Semester, 'id'> & { id?: string };
export type AcademicPaymentInput = Omit<UniversityPayment, 'id'> & { id?: string };

export interface AcademicSnapshot {
  semesters: Semester[];
  payments: UniversityPayment[];
  receipts: AcademicReceipt[];
}

export interface AppSettings {
  pin: string;
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  currencySymbol: string;
  userName: string;
  userEmail: string;
  autoLockOnBackground: boolean;
}

export interface UnifiedActivity {
  id: string;
  type: 'income' | 'expense' | 'university';
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  note?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'monthly'
  | 'university'
  | 'special'
  | 'reports-monthly'
  | 'reports-yearly'
  | 'settings';

/**
 * ── Independent Extra Wallets ────────────────────────────────────────────
 * The user can create any number of standalone cards (e.g. "Brother — 10,000",
 * "Uncle — 20,000"). Each wallet keeps its own ledger and its own balance.
 *
 * These are fully isolated from `incomes`, `expenses` and `universityPayments`:
 * nothing here is ever added to the monthly budget or the semester fund.
 *
 * Wallet balance = sum(deposit) − sum(spend)   (only entries with that walletId)
 */
export interface SpecialWallet {
  id: string;
  name: string; // e.g. "Brother's fund"
  note?: string; // optional purpose
  color: string; // accent colour used by the card UI
  createdAt: string; // ISO timestamp
}

export type SpecialEntryKind = 'deposit' | 'spend';

export interface SpecialFundEntry {
  /** Which wallet this entry belongs to. */
  walletId: string;
  id: string;
  kind: SpecialEntryKind;
  title: string; // deposit: who/why it came · spend: purpose
  amount: number;
  date: string; // YYYY-MM-DD
  month: number; // 0-11
  year: number;
  note?: string;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  remaining: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthBreakdownItem {
  month: number;
  monthName: string;
  income: number;
  expense: number;
  remaining: number;
}

export interface YearlySummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalRemaining: number;
  monthlyBreakdown: MonthBreakdownItem[];
  highestSpendingMonth: { monthName: string; expense: number } | null;
  lowestSpendingMonth: { monthName: string; expense: number } | null;
  topSpendingCategory: { category: string; amount: number } | null;
}
