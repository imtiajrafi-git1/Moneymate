import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';
import { ExpenseCategory, IncomeCategory, IncomeType } from '../../types';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';
import { AcademicPaymentModal } from '../university/AcademicPaymentModal';

/** Today's date in LOCAL time as YYYY-MM-DD (toISOString() is UTC and can be a day off). */
const todayLocal = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Read month/year straight from a YYYY-MM-DD string — no timezone shifting. */
const parseYMD = (value: string): { month: number; year: number } => {
  const [y, m] = value.split('-').map(Number);
  return { month: (m || 1) - 1, year: y || new Date().getFullYear() };
};

export const QuickAddModal: React.FC = () => {
  const {
    isAddModalOpen,
    closeAddModal,
    initialAddType,
    addExpense,
    addIncome,
    settings,
    setSelectedMonth,
    setSelectedYear,
    showToast,
  } = useApp();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  // Keep legacy received-fund records separate from monthly money and academic payments.
  const [incomeType, setIncomeType] = useState<IncomeType>('monthly');

  useEffect(() => {
    if (!isAddModalOpen) return;

    // Always start on TODAY (local time) — never a stale date from when the app first loaded.
    setDate(todayLocal());

    if (initialAddType === 'university') return;

    if (initialAddType === 'semester') {
      // Compatibility for existing callers; this is not an academic fee payment.
      setType('income');
      setIncomeType('semester');
      setCategory('Semester Fund');
      return;
    }
    setIncomeType('monthly');
    setType(initialAddType);
    if (initialAddType === 'expense') setCategory('Food');
    if (initialAddType === 'income') setCategory('Monthly Allowance');
  }, [initialAddType, isAddModalOpen]);

  // Switching Expense <-> Income must also reset the category,
  // otherwise an income could be saved with the expense category "Food".
  const handleTypeSwitch = (next: 'expense' | 'income') => {
    setType(next);
    setIncomeType('monthly');
    setCategory(next === 'expense' ? 'Food' : 'Monthly Allowance');
  };

  const handleIncomeTypeChange = (next: IncomeType) => {
    setIncomeType(next);
    setCategory(next === 'semester' ? 'Semester Fund' : 'Monthly Allowance');
  };

  if (!isAddModalOpen) return null;
  if (initialAddType === 'university') return <AcademicPaymentModal onClose={closeAddModal} />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;
    // Month/year come straight from the picked date string (no UTC shift)
    const { month: m, year: y } = parseYMD(date);
    const money = formatCurrency(numAmount, settings?.currencySymbol ?? '৳');
    const when = formatMonthYear(m, y);

    if (type === 'income') {
      addIncome({
        title: title.trim(),
        amount: numAmount,
        type: incomeType,
        category: (incomeType === 'semester' ? 'Semester Fund' : category) as IncomeCategory,
        date,
        month: m,
        year: y,
        note: note.trim() || undefined,
      });
      if (incomeType === 'semester') {
        showToast(`Separate fund ${money} saved. This is not an academic payment.`);
      } else {
        // Jump the cards to the entry's month so it is visible immediately.
        setSelectedMonth(m);
        setSelectedYear(y);
        showToast(`Income ${money} added · ${when}`);
      }
    } else {
      addExpense({
        title: title.trim(),
        amount: numAmount,
        category: category as ExpenseCategory,
        date,
        month: m,
        year: y,
        isTransport: category === 'Transport',
        note: note.trim() || undefined,
      });
      setSelectedMonth(m);
      setSelectedYear(y);
      showToast(`Expense ${money} added · ${when}`);
    }
    setTitle('');
    setAmount('');
    setNote('');
    closeAddModal();
  };

  const inputCls =
    "w-full rounded-full border border-[#D8C3B3] bg-white px-4 py-2.5 font-sans text-[13px] text-[#2E2733] placeholder:text-[#9A929E] focus:outline-none focus:border-[#8C7C91] focus:ring-2 focus:ring-[#8C7C91]/15 transition-all";

  const selectCls =
    "w-full rounded-full border border-[#D8C3B3] bg-white px-4 py-2.5 font-sans text-[13px] text-[#2E2733] focus:outline-none focus:border-[#8C7C91] transition-colors cursor-pointer";

  const labelCls =
    "block font-sans text-[11px] font-semibold text-[#635B6B] mb-1.5";

  // Regular Expense/Income Modal
  return (
    <div className="fixed inset-0 z-50 flex items-end xs:items-center justify-center p-3 xs:p-4 bg-[#4A3E52]/40 backdrop-blur-[6px]">
      <div className="w-full max-w-[480px] rounded-[20px] xs:rounded-[24px] bg-[#F1EBE4] border border-[#D8C3B3] shadow-[0_24px_64px_rgba(74,62,82,0.22),0_1px_0_rgba(255,255,255,0.9)_inset] overflow-hidden animate-[in_.18s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7D6C4]">
          <div>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A929E]">New entry</p>
            <h3 className="font-sans text-[18px] font-bold tracking-tight text-[#2E2733] mt-0.5">Add record</h3>
          </div>
          <button
            onClick={closeAddModal}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full border border-[#D8C3B3] bg-white text-[#635B6B] hover:text-[#2E2733] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type pills - Only Expense and Income */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-[#F7F1E8] border border-[#E7D6C4]">
            {([
              { id: 'expense', label: 'Expense' },
              { id: 'income', label: 'Income' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeSwitch(t.id)}
                className={`rounded-full py-2 font-sans text-[12px] font-semibold tracking-[-0.01em] transition-all cursor-pointer ${
                  type === t.id
                    ? 'bg-[#8C7C91] text-white shadow-sm'
                    : 'text-[#635B6B] hover:text-[#2E2733]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className={labelCls}>Title</label>
            <input
              type="text"
              required
              placeholder={
                type === 'expense'
                  ? 'e.g. Lunch at cafeteria'
                  : 'e.g. Monthly Allowance'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (৳)</label>
              <input
                type="number"
                step="any"
                required
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputCls} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              />
            </div>
          </div>

          {type === 'expense' && (
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Shopping">Shopping</option>
                <option value="House Rent">House Rent</option>
                <option value="Bills">Bills</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {type === 'income' && (
            <div>
              <label className={labelCls}>Income type</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-[#F7F1E8] border border-[#E7D6C4]">
                {([
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'semester', label: 'Semester Fund' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleIncomeTypeChange(t.id)}
                    className={`rounded-full py-2 font-sans text-[12px] font-semibold transition-all cursor-pointer ${
                      incomeType === t.id
                        ? 'bg-[#8C7C91] text-white shadow-sm'
                        : 'text-[#635B6B] hover:text-[#2E2733]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 font-sans text-[11px] text-[#9A929E]">
                {incomeType === 'semester'
                  ? 'Saved separately, not as an academic payment or monthly income. Use Extra Cards to manage new funds.'
                  : 'Counted in Monthly Overview and Remaining Balance.'}
              </p>
            </div>
          )}

          {type === 'income' && incomeType === 'monthly' && (
            <div>
              <label className={labelCls}>Income category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="Monthly Allowance">Monthly Allowance</option>
                <option value="Salary">Salary</option>
                <option value="Freelance">Freelance</option>
                <option value="Gift">Gift</option>
                <option value="Investment">Investment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>
              Note <span className="font-normal text-[#9A929E]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#8C7C91] py-3 font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_4px_16px_rgba(74,62,82,0.22)] hover:bg-[#776877] active:scale-[0.99] transition-all cursor-pointer"
          >
            Save entry
          </button>
        </form>
      </div>

      <style>{`@keyframes in { from { opacity:0; transform: translateY(12px) scale(0.98);} to { opacity:1; transform: translateY(0) scale(1);} }`}</style>
    </div>
  );
};
