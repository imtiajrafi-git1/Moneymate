import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  Income,
  Expense,
  UniversityPayment,
  Semester,
  AppSettings,
  ActiveTab,
  SpecialFundEntry,
  SpecialWallet,
} from '../types';
import { Storage } from '../utils/storage';
import { useAcademicData } from '../hooks/useAcademicData';
import { academicSupabase } from '../services/academicCloud';
import { backupLocalFinance, FinanceSnapshot, loadFinanceCloud, syncFinanceCloud } from '../services/financeCloud';
import { initializeCloudAppLock, saveCloudAppLock, verifyCloudAppPin } from '../services/appLockCloud';

interface AppContextType extends ReturnType<typeof useAcademicData> {
  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (open: boolean) => void;

  // Selected Month/Year Filter
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;

  // Financial Data
  incomes: Income[];
  expenses: Expense[];
  universityPayments: UniversityPayment[];
  semesters: Semester[];
  settings: AppSettings;

  // Income Actions
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  deleteIncome: (id: string) => void;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // University Actions
  addUniversityPayment: (payment: Omit<UniversityPayment, 'id'>) => void;
  academicSemesterId: string | null;
  setAcademicSemesterId: (id: string | null) => void;

  // Others / Extra wallets — multiple fully independent cards
  specialWallets: SpecialWallet[];
  addWallet: (wallet: Omit<SpecialWallet, 'id' | 'createdAt'>) => string;
  updateWallet: (id: string, patch: Partial<Omit<SpecialWallet, 'id' | 'createdAt'>>) => void;
  deleteWallet: (id: string) => void;
  /** Wallet currently opened on the Others screen (null = wallet list). */
  activeWalletId: string | null;
  setActiveWalletId: (id: string | null) => void;

  specialFund: SpecialFundEntry[];
  addSpecialEntry: (entry: Omit<SpecialFundEntry, 'id'>) => void;
  updateSpecialEntry: (id: string, patch: Partial<Omit<SpecialFundEntry, 'id' | 'walletId'>>) => void;
  deleteSpecialEntry: (id: string) => void;
  financeCloudLoading: boolean;
  financeCloudError: string;
  importLocalRecords: () => Promise<void>;

  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateAppLockSettings: (pin: string | null, enabled: boolean) => Promise<void>;
  resetAllData: () => void;

  // Security Lock
  isLocked: boolean;
  isSecurityLoading: boolean;
  lockApp: () => void;
  unlockApp: (pinInput: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;

  // Quick Add Modal State
  isAddModalOpen: boolean;
  openAddModal: (type?: 'expense' | 'income' | 'university' | 'semester') => void;
  closeAddModal: () => void;
  initialAddType: 'expense' | 'income' | 'university' | 'semester';

  // Save confirmation toast
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
  dismissToast: () => void;

  // Cloud Sign-In & Sync Modal
  isCloudModalOpen: boolean;
  openCloudModal: () => void;
  closeCloudModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default view = the REAL current month/year, so new entries dated "today"
  // always appear in the cards immediately.
  const today = new Date();
  const defaultMonth = today.getMonth();
  const defaultYear = today.getFullYear();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  // Migration: Move university-tagged expenses from expenses to universityPayments
  const migrateUniversityExpenses = (expenses: Expense[], uniPayments: UniversityPayment[]): { expenses: Expense[], uniPayments: UniversityPayment[] } => {
    const uniExpenses = expenses.filter((exp) => exp.isUniversity || exp.category === 'University');
    if (uniExpenses.length === 0) {
      return { expenses, uniPayments };
    }

    // Convert university expenses to university payments
    const newUniPayments: UniversityPayment[] = uniExpenses.map((exp) => ({
      id: exp.id,
      title: exp.title,
      amount: exp.amount,
      semesterId: exp.semesterId || 'sem-3',
      feeType: 'Other',
      date: exp.date,
      month: exp.month,
      year: exp.year,
      note: exp.note,
    }));

    // Remove university expenses from expenses array
    const cleanedExpenses = expenses.filter((exp) => !exp.isUniversity && exp.category !== 'University');

    // Merge with existing university payments
    const existingIds = new Set(uniPayments.map((payment) => payment.id));
    const mergedUniPayments = [...newUniPayments.filter((payment) => !existingIds.has(payment.id)), ...uniPayments];

    // Save migrated data
    Storage.saveExpenses(cleanedExpenses);
    Storage.saveUniversityPayments(mergedUniPayments);

    return { expenses: cleanedExpenses, uniPayments: mergedUniPayments };
  };

  // Run the migration exactly ONCE (lazy initializer), not on every render.
  const [migrated] = useState(() =>
    migrateUniversityExpenses(Storage.getExpenses(), Storage.getUniversityPayments())
  );

  const [incomes, setIncomes] = useState<Income[]>(() => Storage.getIncomes());
  const [expenses, setExpenses] = useState<Expense[]>(migrated.expenses);
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  /*
   * Extra wallets: own state + own storage keys.
   * Never merged with incomes / expenses / universityPayments.
   *
   * Migration: entries saved before multi-wallet support have no `walletId`.
   * They are moved into one "Special Fund" wallet so nothing is lost.
   */
  const [walletBoot] = useState(() => {
    const entries = Storage.getSpecialFund();
    let wallets = Storage.getSpecialWallets();
    const orphans = entries.filter((e) => !e.walletId);

    if (orphans.length > 0 || (wallets.length === 0 && entries.length > 0)) {
      const legacyId = `wal-legacy`;
      if (!wallets.some((w) => w.id === legacyId)) {
        wallets = [
          {
            id: legacyId,
            name: 'Special Fund',
            note: 'Moved from the previous single fund',
            color: '#D8C3B3',
            createdAt: new Date().toISOString(),
          },
          ...wallets,
        ];
      }
      const fixed = entries.map((e) => (e.walletId ? e : { ...e, walletId: legacyId }));
      Storage.saveSpecialWallets(wallets);
      Storage.saveSpecialFund(fixed);
      return { wallets, entries: fixed };
    }
    return { wallets, entries };
  });

  const [specialWallets, setSpecialWallets] = useState<SpecialWallet[]>(walletBoot.wallets);
  const [specialFund, setSpecialFund] = useState<SpecialFundEntry[]>(walletBoot.entries);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // Lock State: Locked on start if PIN is enabled
  const [isLocked, setIsLocked] = useState<boolean>(() => settings.isPinEnabled);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const lastActivityAt = useRef(Date.now());
  const awaySince = useRef<number | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const academic = useAcademicData(isLocked);
  const cloudUserId = academic.academicUser?.id;
  const { semesters, universityPayments, deleteUniversityPayment } = academic;
  const [financeOwner, setFinanceOwner] = useState<string | null>(null);
  const [financeCloudLoading, setFinanceCloudLoading] = useState(false);
  const [financeCloudError, setFinanceCloudError] = useState('');
  const [financeRevision, setFinanceRevision] = useState(0);
  const [securityRevision, setSecurityRevision] = useState(0);
  const remotePinEnabled = useRef<{ ownerId: string; enabled: boolean } | null>(null);
  const financeSnapshotRef = useRef<{ ownerId: string; snapshot: FinanceSnapshot; signature: string } | null>(null);
  const financeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currentCloudUserId = useRef(cloudUserId);
  currentCloudUserId.current = cloudUserId;
  const [academicSemesterId, setAcademicSemesterId] = useState<string | null>(null);

  // Quick Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialAddType, setInitialAddType] = useState<'expense' | 'income' | 'university' | 'semester'>('expense');

  // Cloud Sign-In & Sync Modal
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const openCloudModal = () => setIsCloudModalOpen(true);
  const closeCloudModal = () => setIsCloudModalOpen(false);

  // Save confirmation toast (auto-dismisses)
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const showToast = (message: string) => setToast({ id: Date.now(), message });
  const dismissToast = () => setToast(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        setFinanceRevision((value) => value + 1);
        setSecurityRevision((value) => value + 1);
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, []);

  useEffect(() => {
    if (!cloudUserId || isLocked || !academicSupabase) return;
    const client = academicSupabase;
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void financeQueueRef.current.then(() => {
          if (active && currentCloudUserId.current === cloudUserId && !isLockedRef.current) {
            setFinanceRevision((value) => value + 1);
          }
        });
      }, 100);
    };
    const channel = client
      .channel(`finance-records:${cloudUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_incomes', filter: `user_id=eq.${cloudUserId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_expenses', filter: `user_id=eq.${cloudUserId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_wallets', filter: `user_id=eq.${cloudUserId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_fund_entries', filter: `user_id=eq.${cloudUserId}` }, refresh)
      .subscribe((status, cause) => {
        if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          console.error('Finance Realtime subscription failed:', cause ?? status);
        }
      });
    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, [cloudUserId, isLocked]);

  useEffect(() => {
    const lockAfterMs = 180_000;
    const clearTimer = () => {
      if (inactivityTimer.current !== null) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    };
    const scheduleLock = () => {
      clearTimer();
      if (isLockedRef.current || document.visibilityState !== 'visible') return;
      const remaining = lockAfterMs - (Date.now() - lastActivityAt.current);
      if (remaining <= 0) {
        setIsLocked(true);
        return;
      }
      inactivityTimer.current = setTimeout(() => {
        if (document.visibilityState === 'visible' && Date.now() - lastActivityAt.current >= lockAfterMs) {
          setIsLocked(true);
        } else {
          scheduleLock();
        }
      }, remaining);
    };
    const onActivity = () => {
      if (isLockedRef.current || document.visibilityState !== 'visible') return;
      lastActivityAt.current = Date.now();
      scheduleLock();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        awaySince.current = Date.now();
        clearTimer();
        return;
      }
      const awayDuration = awaySince.current === null ? 0 : Date.now() - awaySince.current;
      awaySince.current = null;
      if (!isLockedRef.current && awayDuration >= lockAfterMs) {
        setIsLocked(true);
        return;
      }
      lastActivityAt.current = Date.now();
      scheduleLock();
    };
    if (isLocked) clearTimer();
    else {
      lastActivityAt.current = Date.now();
      scheduleLock();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('wheel', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('scroll', onActivity);
    };
  }, [isLocked]);

  useEffect(() => {
    let active = true;
    if (!cloudUserId) {
      remotePinEnabled.current = null;
      setIsSecurityLoading(false);
      return () => { active = false; };
    }
    const requiresInitialSync = remotePinEnabled.current?.ownerId !== cloudUserId;
    setIsSecurityLoading(requiresInitialSync);
    void initializeCloudAppLock(
      cloudUserId,
      settingsRef.current.pin,
      settingsRef.current.isPinEnabled,
    ).then((enabled) => {
      if (!active || currentCloudUserId.current !== cloudUserId) return;
      const previous = remotePinEnabled.current;
      const changedFromDisabled = previous?.ownerId === cloudUserId
        ? previous.enabled === false && enabled
        : enabled;
      remotePinEnabled.current = { ownerId: cloudUserId, enabled };
      setSettings((current) => ({ ...current, isPinEnabled: enabled }));
      if (changedFromDisabled) setIsLocked(true);
      setIsSecurityLoading(false);
    }).catch((cause: unknown) => {
      if (!active || currentCloudUserId.current !== cloudUserId) return;
      setIsLocked(true);
      setIsSecurityLoading(false);
      showToast(cause instanceof Error ? cause.message : 'Could not sync your shared app lock.');
    });
    return () => { active = false; };
  }, [cloudUserId, securityRevision]);

  useEffect(() => {
    if (isLocked) return;
    let active = true;
    const hasCurrentSnapshot = Boolean(
      cloudUserId && financeSnapshotRef.current?.ownerId === cloudUserId
    );
    if (!hasCurrentSnapshot) financeSnapshotRef.current = null;
    setFinanceCloudError('');
    if (!cloudUserId) {
      setFinanceCloudLoading(false);
      setIncomes(Storage.getIncomes());
      setExpenses(Storage.getExpenses());
      setSpecialWallets(Storage.getSpecialWallets());
      setSpecialFund(Storage.getSpecialFund());
      setFinanceOwner(null);
      return () => { active = false; };
    }

    setFinanceCloudLoading(true);
    if (!hasCurrentSnapshot) {
      setFinanceOwner(null);
      setIncomes([]);
      setExpenses([]);
      setSpecialWallets([]);
      setSpecialFund([]);
    }
    void loadFinanceCloud(cloudUserId).then((snapshot) => {
      if (!active) return;
      financeSnapshotRef.current = {
        ownerId: cloudUserId,
        snapshot,
        signature: JSON.stringify(snapshot),
      };
      setIncomes(snapshot.incomes);
      setExpenses(snapshot.expenses);
      setSpecialWallets(snapshot.specialWallets);
      setSpecialFund(snapshot.specialFund);
      setFinanceOwner(cloudUserId);
    }).catch((cause: unknown) => {
      if (!active) return;
      const message = cause instanceof Error ? cause.message : 'Could not load cloud financial records.';
      setFinanceCloudError(message);
      showToast(message);
    }).finally(() => {
      if (active) setFinanceCloudLoading(false);
    });
    return () => { active = false; };
  }, [cloudUserId, isLocked, financeRevision]);

  useEffect(() => {
    if (!cloudUserId && financeOwner === null) Storage.saveIncomes(incomes);
  }, [incomes, cloudUserId, financeOwner]);

  useEffect(() => {
    if (!cloudUserId && financeOwner === null) Storage.saveExpenses(expenses);
  }, [expenses, cloudUserId, financeOwner]);

  useEffect(() => {
    if (!cloudUserId && financeOwner === null) Storage.saveSpecialFund(specialFund);
  }, [specialFund, cloudUserId, financeOwner]);

  useEffect(() => {
    if (!cloudUserId && financeOwner === null) Storage.saveSpecialWallets(specialWallets);
  }, [specialWallets, cloudUserId, financeOwner]);

  useEffect(() => {
    Storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!cloudUserId || isLocked || financeCloudLoading || financeCloudError || financeOwner !== cloudUserId) return;
    const snapshot: FinanceSnapshot = { incomes, expenses, specialWallets, specialFund };
    const signature = JSON.stringify(snapshot);
    const synced = financeSnapshotRef.current;
    if (!synced || synced.ownerId !== cloudUserId || synced.signature === signature) return;

    financeQueueRef.current = financeQueueRef.current.catch(() => undefined).then(async () => {
      const latest = financeSnapshotRef.current;
      if (!latest || latest.ownerId !== cloudUserId || currentCloudUserId.current !== cloudUserId) return;
      await syncFinanceCloud(cloudUserId, snapshot, latest.snapshot);
      if (currentCloudUserId.current !== cloudUserId) return;
      financeSnapshotRef.current = { ownerId: cloudUserId, snapshot, signature };
      setFinanceCloudError('');
      setFinanceRevision((value) => value + 1);
    }).catch((cause: unknown) => {
      if (currentCloudUserId.current !== cloudUserId) return;
      const message = cause instanceof Error ? cause.message : 'Could not save cloud financial records.';
      setFinanceCloudError(message);
      showToast(message);
    });
  }, [incomes, expenses, specialWallets, specialFund, cloudUserId, isLocked, financeCloudLoading, financeCloudError, financeOwner]);

  const financeReady = !financeCloudLoading
    && !financeCloudError
    && financeOwner === (cloudUserId ?? null);
  const ensureFinanceReady = () => {
    if (!financeReady) {
      showToast(financeCloudError || 'Your cloud records are loading. Please wait before making changes.');
      return false;
    }
    return true;
  };

  const importLocalRecords = async () => {
    const userId = academic.academicUser?.id;
    if (!userId || !financeReady) throw new Error('Sign in and wait for cloud records to load before backing up.');
    await academic.importLocalAcademic();
    const localSnapshot: FinanceSnapshot = {
      incomes: Storage.getIncomes(),
      expenses: Storage.getExpenses(),
      specialWallets: Storage.getSpecialWallets(),
      specialFund: Storage.getSpecialFund(),
    };
    await backupLocalFinance(userId, localSnapshot);
    const refreshed = await loadFinanceCloud(userId);
    if (currentCloudUserId.current !== userId) throw new Error('Your cloud session changed. Please sign in again.');
    financeSnapshotRef.current = {
      ownerId: userId, snapshot: refreshed, signature: JSON.stringify(refreshed),
    };
    setIncomes(refreshed.incomes);
    setExpenses(refreshed.expenses);
    setSpecialWallets(refreshed.specialWallets);
    setSpecialFund(refreshed.specialFund);
    setFinanceOwner(userId);
    setFinanceCloudError('');
  };

  // Lock actions
  const lockApp = () => {
    setIsLocked(true);
  };

  const unlockApp = async (pinInput: string): Promise<boolean> => {
    const valid = cloudUserId
      ? await verifyCloudAppPin(cloudUserId, pinInput)
      : pinInput === settings.pin;
    if (valid) setIsLocked(false);
    return valid;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      if (window.PublicKeyCredential && navigator.credentials) {
        setIsLocked(false);
        return true;
      }
      setIsLocked(false);
      return true;
    } catch (err) {
      console.warn('Biometric auth failed or cancelled:', err);
      return false;
    }
  };

  // Income Handlers
  const addIncome = (incomeData: Omit<Income, 'id'>) => {
    if (!ensureFinanceReady()) return;
    const newIncome: Income = {
      ...incomeData,
      type: incomeData.type ?? 'monthly', // always persisted; never ambiguous
      id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setIncomes((prev) => [newIncome, ...prev]);
  };

  const updateIncome = (id: string, updated: Partial<Income>) => {
    if (!ensureFinanceReady()) return;
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, ...updated } : inc)));
  };

  const deleteIncome = (id: string) => {
    if (!ensureFinanceReady()) return;
    setIncomes((prev) => prev.filter((inc) => inc.id !== id));
  };

  /*
   * NOTE on separation of concerns:
   * - `expenses`  = general living expenses (Food, Transport, House Rent, Bills…)
   * - `incomes`   = income sources
   * - `universityPayments` = academic payments (tuition, fees, transport-for-uni)
   * These are three INDEPENDENT stores. University payments are NEVER written
   * into `expenses`, so they can never appear in the Monthly overview/card.
   * University totals are driven purely by the `universityPayments` array.
   */

  // Expense Handlers
  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (!ensureFinanceReady()) return;
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExpense: Expense = {
      ...expenseData,
      id,
    };
    // If marked as a university expense, route it to the university store instead.
    if (expenseData.isUniversity || expenseData.category === 'University') {
      const activeSem = semesters.find((s) => s.status === 'Active') || semesters[0];
      const uniData = expenseData as unknown as Partial<UniversityPayment>;
      const newUniPay: UniversityPayment = {
        id,
        title: expenseData.title,
        amount: expenseData.amount,
        semesterId: expenseData.semesterId || activeSem?.id || 'sem-3',
        feeType: uniData.feeType ?? 'Other',
        date: expenseData.date,
        month: expenseData.month,
        year: expenseData.year,
        note: expenseData.note,
      };
      addUniversityPayment(newUniPay);
      return; // do NOT add to expenses
    }
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const updateExpense = (id: string, updated: Partial<Expense>) => {
    if (!ensureFinanceReady()) return;
    setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...updated } : exp)));
  };

  const deleteExpense = (id: string) => {
    if (!ensureFinanceReady()) return;
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  // University Handlers
  const addUniversityPayment = (paymentData: Omit<UniversityPayment, 'id'>) => {
    void academic.saveAcademicPayment(paymentData).then(() => showToast('Academic payment saved.'))
      .catch((cause: unknown) => showToast(cause instanceof Error ? cause.message : 'Payment could not be saved.'));
  };

  /*
   * Extra wallet handlers — touch ONLY `specialWallets` / `specialFund`.
   * No handler below reads or writes incomes, expenses or universityPayments,
   * so these cards can never affect the monthly budget or semester fund.
   */
  const addWallet = (data: Omit<SpecialWallet, 'id' | 'createdAt'>): string => {
    if (!ensureFinanceReady()) return '';
    const id = `wal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSpecialWallets((prev) => [
      ...prev,
      { ...data, id, createdAt: new Date().toISOString() },
    ]);
    return id;
  };

  const updateWallet = (
    id: string,
    patch: Partial<Omit<SpecialWallet, 'id' | 'createdAt'>>
  ) => {
    if (!ensureFinanceReady()) return;
    setSpecialWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  /** Deleting a wallet also removes its entries, so no orphans remain. */
  const deleteWallet = (id: string) => {
    if (!ensureFinanceReady()) return;
    setSpecialWallets((prev) => prev.filter((w) => w.id !== id));
    setSpecialFund((prev) => prev.filter((e) => e.walletId !== id));
    setActiveWalletId((cur) => (cur === id ? null : cur));
  };

  const addSpecialEntry = (entryData: Omit<SpecialFundEntry, 'id'>) => {
    if (!ensureFinanceReady()) return;
    const newEntry: SpecialFundEntry = {
      ...entryData,
      id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setSpecialFund((prev) => [newEntry, ...prev]);
  };

  const updateSpecialEntry = (
    id: string,
    patch: Partial<Omit<SpecialFundEntry, 'id' | 'walletId'>>
  ) => {
    if (!ensureFinanceReady()) return;
    setSpecialFund((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const deleteSpecialEntry = (id: string) => {
    if (!ensureFinanceReady()) return;
    setSpecialFund((prev) => prev.filter((e) => e.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateAppLockSettings = async (pin: string | null, enabled: boolean) => {
    if (pin !== null && !/^\d{4}$/.test(pin)) {
      throw new Error('PIN must contain exactly four digits.');
    }
    if (cloudUserId) await saveCloudAppLock(cloudUserId, pin, enabled);
    setSettings((previous) => ({
      ...previous,
      ...(pin === null ? {} : { pin }),
      isPinEnabled: enabled,
    }));
    if (cloudUserId) remotePinEnabled.current = { ownerId: cloudUserId, enabled };
  };

  const resetAllData = () => {
    Storage.resetAllData();
    if (!cloudUserId) {
      setIncomes(Storage.getIncomes());
      setExpenses(Storage.getExpenses());
      academic.resetLocalAcademic();
      setAcademicSemesterId(null);
      setSpecialFund(Storage.getSpecialFund());
      setSpecialWallets(Storage.getSpecialWallets());
      setActiveWalletId(null);
    }
    setSettings(Storage.getSettings());
  };

  // Quick Add Modal
  const openAddModal = (type: 'expense' | 'income' | 'university' | 'semester' = 'expense') => {
    setInitialAddType(type);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const financeOwnerMatches = financeOwner === (cloudUserId ?? null);
  const visibleIncomes = financeOwnerMatches ? incomes : [];
  const visibleExpenses = financeOwnerMatches ? expenses : [];
  const visibleSpecialWallets = financeOwnerMatches ? specialWallets : [];
  const visibleSpecialFund = financeOwnerMatches ? specialFund : [];

  return (
    <AppContext.Provider
      value={{
        ...academic,
        activeTab,
        setActiveTab,
        isMoreMenuOpen,
        setIsMoreMenuOpen,
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        incomes: visibleIncomes,
        expenses: visibleExpenses,
        universityPayments,
        semesters,
        settings,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addUniversityPayment,
        deleteUniversityPayment,
        academicSemesterId,
        setAcademicSemesterId,
        specialWallets: visibleSpecialWallets,
        addWallet,
        updateWallet,
        deleteWallet,
        activeWalletId,
        setActiveWalletId,
        specialFund: visibleSpecialFund,
        addSpecialEntry,
        updateSpecialEntry,
        deleteSpecialEntry,
        financeCloudLoading,
        financeCloudError,
        importLocalRecords,
        updateSettings,
        updateAppLockSettings,
        resetAllData,
        isLocked,
        isSecurityLoading,
        lockApp,
        unlockApp,
        unlockWithBiometrics,
        isAddModalOpen,
        openAddModal,
        closeAddModal,
        initialAddType,
        toast,
        showToast,
        dismissToast,
        isCloudModalOpen,
        openCloudModal,
        closeCloudModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
