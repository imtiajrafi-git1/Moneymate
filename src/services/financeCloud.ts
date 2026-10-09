import type { Expense, Income, SpecialFundEntry, SpecialWallet } from '../types';
import { academicSupabase } from './academicCloud';

export interface FinanceSnapshot {
  incomes: Income[];
  expenses: Expense[];
  specialWallets: SpecialWallet[];
  specialFund: SpecialFundEntry[];
}

interface IncomeRow {
  id: string;
  title: string;
  amount: number;
  category: Income['category'];
  income_type: Income['type'] | null;
  occurred_on: string;
  note: string | null;
}

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  category: Expense['category'];
  occurred_on: string;
  note: string | null;
  is_university: boolean;
  is_transport: boolean;
  semester_id: string | null;
}

interface WalletRow {
  id: string;
  name: string;
  note: string | null;
  color: string;
  created_at: string;
}

interface SpecialEntryRow {
  id: string;
  wallet_id: string;
  kind: SpecialFundEntry['kind'];
  title: string;
  amount: number;
  occurred_on: string;
  note: string | null;
}

async function requireUser(expectedUserId: string) {
  if (!academicSupabase) throw new Error('Supabase is not configured.');
  const { data, error } = await academicSupabase.auth.getUser();
  if (error || data.user?.id !== expectedUserId) {
    throw new Error('Your cloud session has changed. Please sign in again.');
  }
  return academicSupabase;
}

async function readAll<T>(table: string, userId: string): Promise<T[]> {
  const client = await requireUser(userId);
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from(table).select('*')
      .eq('user_id', userId).order('created_at').order('id').range(start, start + 499);
    if (error) throw new Error(`Could not load cloud records. ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < 500) break;
  }
  return rows;
}

function withCalendarDate<T extends { date: string }>(row: T) {
  const [year, month] = row.date.split('-').map(Number);
  return { ...row, month: month - 1, year };
}

export async function loadFinanceCloud(userId: string): Promise<FinanceSnapshot> {
  const [incomeRows, expenseRows, walletRows, entryRows] = await Promise.all([
    readAll<IncomeRow>('money_incomes', userId),
    readAll<ExpenseRow>('money_expenses', userId),
    readAll<WalletRow>('special_wallets', userId),
    readAll<SpecialEntryRow>('special_fund_entries', userId),
  ]);
  return {
    incomes: incomeRows.map((row) => withCalendarDate({
      id: row.id, title: row.title, amount: Number(row.amount), category: row.category,
      type: row.income_type ?? 'monthly', date: row.occurred_on, note: row.note ?? undefined,
    })),
    expenses: expenseRows.map((row) => withCalendarDate({
      id: row.id, title: row.title, amount: Number(row.amount), category: row.category,
      date: row.occurred_on, note: row.note ?? undefined, isUniversity: row.is_university,
      isTransport: row.is_transport, semesterId: row.semester_id ?? undefined,
    })),
    specialWallets: walletRows.map((row) => ({
      id: row.id, name: row.name, note: row.note ?? undefined, color: row.color, createdAt: row.created_at,
    })),
    specialFund: entryRows.map((row) => withCalendarDate({
      id: row.id, walletId: row.wallet_id, kind: row.kind, title: row.title,
      amount: Number(row.amount), date: row.occurred_on, note: row.note ?? undefined,
    })),
  };
}

function sameRecord<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function saveChangedRows<T extends { id: string }>(
  client: NonNullable<typeof academicSupabase>,
  table: string,
  userId: string,
  current: T[],
  previous: T[],
  toRow: (item: T) => Record<string, unknown>,
): Promise<void> {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const removedIds = previous.filter((item) => !currentById.has(item.id)).map((item) => item.id);
  if (removedIds.length) {
    const { error } = await client.from(table).delete().eq('user_id', userId).in('id', removedIds);
    if (error) throw new Error(`Could not delete cloud records. ${error.message}`);
  }
  const changedRows = current
    .filter((item) => !previousById.has(item.id) || !sameRecord(item, previousById.get(item.id)))
    .map((item) => ({ user_id: userId, ...toRow(item) }));
  if (changedRows.length) {
    const { error } = await client.from(table).upsert(changedRows, { onConflict: 'user_id,id' });
    if (error) throw new Error(`Could not save cloud records. ${error.message}`);
  }
}

export async function syncFinanceCloud(
  userId: string,
  current: FinanceSnapshot,
  previous: FinanceSnapshot,
): Promise<void> {
  const client = await requireUser(userId);
  const currentEntryIds = new Set(current.specialFund.map((entry) => entry.id));
  const removedEntryIds = previous.specialFund.filter((entry) => !currentEntryIds.has(entry.id)).map((entry) => entry.id);
  if (removedEntryIds.length) {
    const { error } = await client.from('special_fund_entries').delete()
      .eq('user_id', userId).in('id', removedEntryIds);
    if (error) throw new Error(`Could not delete extra-card entries. ${error.message}`);
  }
  await saveChangedRows(client, 'money_expenses', userId, current.expenses, previous.expenses, (expense) => ({
    id: expense.id, title: expense.title, amount: expense.amount, category: expense.category,
    occurred_on: expense.date, note: expense.note ?? null, is_university: expense.isUniversity ?? false,
    is_transport: expense.isTransport ?? false, semester_id: expense.semesterId ?? null,
  }));
  await saveChangedRows(client, 'money_incomes', userId, current.incomes, previous.incomes, (income) => ({
    id: income.id, title: income.title, amount: income.amount, category: income.category,
    income_type: income.type ?? 'monthly', occurred_on: income.date, note: income.note ?? null,
  }));
  await saveChangedRows(client, 'special_wallets', userId, current.specialWallets, previous.specialWallets, (wallet) => ({
    id: wallet.id, name: wallet.name, note: wallet.note ?? null, color: wallet.color, created_at: wallet.createdAt,
  }));
  // Wallets must exist before their entries.
  await saveChangedRows(client, 'special_fund_entries', userId, current.specialFund, previous.specialFund, (entry) => ({
    id: entry.id, wallet_id: entry.walletId, kind: entry.kind, title: entry.title,
    amount: entry.amount, occurred_on: entry.date, note: entry.note ?? null,
  }));
}

export async function backupLocalFinance(userId: string, snapshot: FinanceSnapshot): Promise<void> {
  const client = await requireUser(userId);
  const saveAll = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    const { error } = await client.from(table).upsert(rows.map((row) => ({ user_id: userId, ...row })), {
      onConflict: 'user_id,id',
    });
    if (error) throw new Error(`Could not back up ${table}. ${error.message}`);
  };
  await saveAll('special_wallets', snapshot.specialWallets.map((wallet) => ({
    id: wallet.id, name: wallet.name, note: wallet.note ?? null, color: wallet.color, created_at: wallet.createdAt,
  })));
  await saveAll('money_incomes', snapshot.incomes.map((income) => ({
    id: income.id, title: income.title, amount: income.amount, category: income.category,
    income_type: income.type ?? 'monthly', occurred_on: income.date, note: income.note ?? null,
  })));
  await saveAll('money_expenses', snapshot.expenses.map((expense) => ({
    id: expense.id, title: expense.title, amount: expense.amount, category: expense.category,
    occurred_on: expense.date, note: expense.note ?? null, is_university: expense.isUniversity ?? false,
    is_transport: expense.isTransport ?? false, semester_id: expense.semesterId ?? null,
  })));
  await saveAll('special_fund_entries', snapshot.specialFund.map((entry) => ({
    id: entry.id, wallet_id: entry.walletId, kind: entry.kind, title: entry.title,
    amount: entry.amount, occurred_on: entry.date, note: entry.note ?? null,
  })));
}
