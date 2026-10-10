import {
  Expense,
  Income,
  UniversityPayment,
  Semester,
  AppSettings,
  SpecialFundEntry,
  SpecialWallet,
  AcademicReceipt,
  AcademicSnapshot,
} from '../types';

const STORAGE_KEYS = {
  INCOMES: 'moneymate_incomes_v1',
  EXPENSES: 'moneymate_expenses_v1',
  UNIVERSITY_PAYMENTS: 'moneymate_university_payments_v1',
  SEMESTERS: 'moneymate_semesters_v1',
  SETTINGS: 'moneymate_settings_v1',
  // Own keys: extra wallets never share a store with monthly or university data.
  SPECIAL_FUND: 'moneymate_special_fund_v1',
  SPECIAL_WALLETS: 'moneymate_special_wallets_v1',
  ACADEMIC_RECEIPTS: 'moneymate_academic_receipts_v1',
};

// Extra wallets start empty — they only contain what the user creates.
const INITIAL_SPECIAL_FUND: SpecialFundEntry[] = [];
const INITIAL_SPECIAL_WALLETS: SpecialWallet[] = [];

/** Accent colours offered when creating a wallet. */
export const WALLET_COLORS = ['#D8C3B3', '#85A8A3', '#8C7C91', '#C08578', '#94AEBF', '#C4A366'];

// Initial default settings
export const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  isPinEnabled: true,
  isBiometricEnabled: true,
  currencySymbol: '৳',
  userName: 'Imtiaj Rafi',
  userEmail: 'imtiajrafi7824@gmail.com',
  autoLockOnBackground: false,
};

// Default seed data for initial load
const INITIAL_SEMESTERS: Semester[] = [
  { id: 'sem-1', name: 'Spring 2025', totalFee: 45000, status: 'Completed', fees: [
    { id: 'fee-1a', category: 'Registration Fee', amount: 25000 },
    { id: 'fee-1b', category: 'Final Exam Fee', amount: 17000 },
    { id: 'fee-1c', category: 'Transport Fee', amount: 3000 },
  ] },
  { id: 'sem-2', name: 'Fall 2025', totalFee: 45000, status: 'Completed', fees: [
    { id: 'fee-2a', category: 'Registration Fee', amount: 25000 },
    { id: 'fee-2b', category: 'Final Exam Fee', amount: 17000 },
    { id: 'fee-2c', category: 'Transport Fee', amount: 3000 },
  ] },
  { id: 'sem-3', name: 'Spring 2026', totalFee: 50000, status: 'Active', fees: [
    { id: 'fee-3a', category: 'Registration Fee', amount: 30000 },
    { id: 'fee-3b', category: 'Final Exam Fee', amount: 17000 },
    { id: 'fee-3c', category: 'Transport Fee', amount: 3000 },
  ] },
];

const INITIAL_UNIVERSITY_PAYMENTS: UniversityPayment[] = [
  {
    id: 'unipay-1',
    title: '1st Semester Tuition Fee',
    amount: 20000,
    semesterId: 'sem-1',
    feeType: 'Registration Fee',
    paymentMethod: 'Bank',
    date: '2025-02-15',
    month: 1,
    year: 2025,
    note: 'Initial installment',
  },
  {
    id: 'unipay-2',
    title: '2nd Semester Full Payment',
    amount: 25000,
    semesterId: 'sem-2',
    feeType: 'Registration Fee',
    paymentMethod: 'Bank',
    date: '2025-08-20',
    month: 7,
    year: 2025,
    note: 'Semester cleared',
  },
  {
    id: 'unipay-3',
    title: '3rd Semester Midterm Payment',
    amount: 30000,
    semesterId: 'sem-3',
    feeType: 'Registration Fee',
    paymentMethod: 'bKash',
    date: '2026-08-01',
    month: 7,
    year: 2026,
    note: 'Current semester payment',
  },
];

const INITIAL_INCOMES: Income[] = [
  {
    id: 'inc-1',
    title: 'Monthly Allowance from Parents',
    amount: 10000,
    category: 'Monthly Allowance',
    date: '2026-08-01',
    month: 7,
    year: 2026,
    note: 'August allowance',
  },
  {
    id: 'inc-2',
    title: 'Freelance Design Project',
    amount: 10000,
    category: 'Freelance',
    date: '2026-08-05',
    month: 7,
    year: 2026,
    note: 'Website design gig',
  },
  {
    id: 'inc-3',
    title: 'July Allowance',
    amount: 10000,
    category: 'Monthly Allowance',
    date: '2026-07-01',
    month: 6,
    year: 2026,
  },
  {
    id: 'inc-4',
    title: 'June Allowance',
    amount: 10000,
    category: 'Monthly Allowance',
    date: '2026-06-01',
    month: 5,
    year: 2026,
  },
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'Food & Cafeteria Snacks',
    amount: 250,
    category: 'Food',
    date: '2026-08-08',
    month: 7,
    year: 2026,
    note: 'Lunch at Uni Canteen',
  },
  {
    id: 'exp-2',
    title: 'Bus & Uber Fare',
    amount: 80,
    category: 'Transport',
    date: '2026-08-08',
    month: 7,
    year: 2026,
    isTransport: true,
  },
  {
    id: 'exp-4',
    title: 'Monthly Bus Pass',
    amount: 1200,
    category: 'Transport',
    date: '2026-08-03',
    month: 7,
    year: 2026,
    isTransport: true,
  },
  {
    id: 'exp-5',
    title: 'Books & Course Materials',
    amount: 1970,
    category: 'Shopping',
    date: '2026-08-02',
    month: 7,
    year: 2026,
  },
];

// Helper to get stored item or fallback to initial
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error loading ${key} from localStorage:`, err);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

// Dedicated helpers
export const Storage = {
  getIncomes: (): Income[] => loadFromStorage(STORAGE_KEYS.INCOMES, INITIAL_INCOMES),
  saveIncomes: (incomes: Income[]) => saveToStorage(STORAGE_KEYS.INCOMES, incomes),

  getExpenses: (): Expense[] => loadFromStorage(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES),
  saveExpenses: (expenses: Expense[]) => saveToStorage(STORAGE_KEYS.EXPENSES, expenses),

  getUniversityPayments: (): UniversityPayment[] =>
    loadFromStorage(STORAGE_KEYS.UNIVERSITY_PAYMENTS, INITIAL_UNIVERSITY_PAYMENTS),
  saveUniversityPayments: (payments: UniversityPayment[]) =>
    saveToStorage(STORAGE_KEYS.UNIVERSITY_PAYMENTS, payments),

  getAcademicReceipts: (): AcademicReceipt[] => loadFromStorage(STORAGE_KEYS.ACADEMIC_RECEIPTS, []),

  // Keep file blobs in IndexedDB; localStorage only contains small metadata.
  saveAcademicSnapshot: (snapshot: AcademicSnapshot): void => {
    const writes: [string, unknown][] = [
      [STORAGE_KEYS.SEMESTERS, snapshot.semesters],
      [STORAGE_KEYS.UNIVERSITY_PAYMENTS, snapshot.payments],
      [STORAGE_KEYS.ACADEMIC_RECEIPTS, snapshot.receipts],
    ];
    const previous = writes.map(([key]) => [key, localStorage.getItem(key)] as const);
    try {
      writes.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    } catch {
      previous.forEach(([key, value]) => {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
      throw new Error('Could not save academic records. Please free some device storage and try again.');
    }
  },

  getSpecialFund: (): SpecialFundEntry[] =>
    loadFromStorage(STORAGE_KEYS.SPECIAL_FUND, INITIAL_SPECIAL_FUND),
  saveSpecialFund: (entries: SpecialFundEntry[]) =>
    saveToStorage(STORAGE_KEYS.SPECIAL_FUND, entries),

  getSpecialWallets: (): SpecialWallet[] =>
    loadFromStorage(STORAGE_KEYS.SPECIAL_WALLETS, INITIAL_SPECIAL_WALLETS),
  saveSpecialWallets: (wallets: SpecialWallet[]) =>
    saveToStorage(STORAGE_KEYS.SPECIAL_WALLETS, wallets),

  getSemesters: (): Semester[] => loadFromStorage(STORAGE_KEYS.SEMESTERS, INITIAL_SEMESTERS),
  saveSemesters: (semesters: Semester[]) => saveToStorage(STORAGE_KEYS.SEMESTERS, semesters),

  getSettings: (): AppSettings => {
    const loaded = loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    // Migration: update legacy default user name to the new profile name
    if (loaded.userName === 'Shakib Rahman') {
      loaded.userName = 'Imtiaj Rafi';
      saveToStorage(STORAGE_KEYS.SETTINGS, loaded);
    }
    return loaded;
  },
  saveSettings: (settings: AppSettings) => saveToStorage(STORAGE_KEYS.SETTINGS, settings),

  resetAllData: () => {
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(INITIAL_INCOMES));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    localStorage.setItem(
      STORAGE_KEYS.UNIVERSITY_PAYMENTS,
      JSON.stringify(INITIAL_UNIVERSITY_PAYMENTS)
    );
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(INITIAL_SEMESTERS));
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_RECEIPTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SPECIAL_FUND, JSON.stringify(INITIAL_SPECIAL_FUND));
    localStorage.setItem(STORAGE_KEYS.SPECIAL_WALLETS, JSON.stringify(INITIAL_SPECIAL_WALLETS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  },
};
