import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getWalletSummary, getAllWalletsSummary } from '../../utils/finance';
import { formatCurrency, formatDateLabel } from '../../utils/formatters';
import { WALLET_COLORS } from '../../utils/storage';
import { SpecialEntryKind, SpecialFundEntry } from '../../types';
import {
  Wallet,
  Plus,
  Minus,
  Trash2,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

/** Today's date in LOCAL time (YYYY-MM-DD). */
const todayLocal = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const inputCls =
  'w-full rounded-full border border-[#D8C3B3] bg-white px-4 py-2.5 font-sans text-[13px] text-[#2E2733] placeholder:text-[#9A929E] focus:outline-none focus:border-[#8C7C91] focus:ring-2 focus:ring-[#8C7C91]/15 transition-all';
const labelCls = 'block font-sans text-[11px] font-semibold text-[#635B6B] mb-1.5';

/* ══════════════════ Wallet list ══════════════════ */
const WalletList: React.FC = () => {
  const { specialWallets, specialFund, addWallet, settings, setActiveWalletId, showToast } = useApp();
  const symbol = settings?.currencySymbol ?? '৳';
  const totals = useMemo(
    () => getAllWalletsSummary(specialWallets, specialFund),
    [specialWallets, specialFund]
  );

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(WALLET_COLORS[0]);
  const [openingAmount, setOpeningAmount] = useState('');
  const [error, setError] = useState('');
  const { addSpecialEntry } = useApp();

  const openCreate = () => {
    setName('');
    setNote('');
    setColor(WALLET_COLORS[totals.walletCount % WALLET_COLORS.length]);
    setOpeningAmount('');
    setError('');
    setCreating(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please give this card a name.');
      return;
    }
    const opening = parseFloat(openingAmount);
    if (openingAmount && (isNaN(opening) || opening < 0)) {
      setError('Opening amount must be 0 or more.');
      return;
    }
    const id = addWallet({ name: name.trim(), note: note.trim() || undefined, color });

    // Optional opening balance becomes the wallet's first deposit.
    if (openingAmount && opening > 0) {
      const date = todayLocal();
      const [y, m] = date.split('-').map(Number);
      addSpecialEntry({
        walletId: id,
        kind: 'deposit',
        title: 'Opening amount',
        amount: opening,
        date,
        month: (m || 1) - 1,
        year: y || new Date().getFullYear(),
      });
    }
    showToast(`Card “${name.trim()}” created`);
    setCreating(false);
    setActiveWalletId(id);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Overview header */}
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] p-4 shadow-md border border-white/5">
        <div className="pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 rounded-full bg-[#D8C3B3]/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-black uppercase tracking-[0.11em] text-[#9A8F9E] leading-none">
              Others
            </p>
            <h1 className="mt-1.5 font-sans text-[17px] font-extrabold tracking-tight text-white leading-none">
              Extra Cards
            </h1>
            <p className="mt-1.5 font-sans text-[11px] font-bold text-[#9A8F9E]/70">
              {totals.walletCount} {totals.walletCount === 1 ? 'card' : 'cards'} · independent
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-2 font-sans text-[12px] font-bold text-white hover:bg-white/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New card
          </button>
        </div>

        {totals.walletCount > 0 && (
          <div className="relative mt-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A8F9E]">
                Combined remaining
              </span>
              <span className="font-sans text-[22px] font-black tracking-tight text-white leading-none">
                {formatCurrency(totals.remaining, symbol)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Isolation note */}
      <div className="flex items-start gap-2 rounded-2xl border border-[#D8C3B3] bg-white/60 px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6D8F8A]" />
        <p className="font-sans text-[11.5px] leading-[1.5] text-[#635B6B]">
          Every card here keeps its own balance. Nothing is added to or subtracted from your
          Monthly Overview or University payments.
        </p>
      </div>

      {/* Wallet cards */}
      {totals.walletCount === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#D8C3B3] bg-[#F7F1E8] px-4 py-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#E7D6C4] bg-white text-[#9A929E]">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="mt-3 font-sans text-[14px] font-bold text-[#2E2733]">No extra cards yet</p>
          <p className="mx-auto mt-1 max-w-[34ch] font-sans text-[12px] leading-[1.5] text-[#635B6B]">
            Create a card for any separate money — e.g. 10,000 from your brother — then track every
            expense inside that card.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#8C7C91] px-4 py-2 font-sans text-[12px] font-bold text-white hover:bg-[#776877] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create first card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {totals.perWallet.map(({ wallet, received, spent, remaining }) => (
            <button
              key={wallet.id}
              onClick={() => setActiveWalletId(wallet.id)}
              className="group text-left rounded-[16px] border border-white/80 bg-white/85 p-3.5 shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: wallet.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[13.5px] font-bold text-[#2E2733]">
                      {wallet.name}
                    </p>
                    {wallet.note && (
                      <p className="truncate font-sans text-[11px] text-[#9A929E]">{wallet.note}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#C4AB94] group-hover:text-[#8C7C91]" />
              </div>

              <p
                className={`mt-2.5 font-sans text-[22px] font-black tracking-tight leading-none ${
                  remaining < 0 ? 'text-[#B0736A]' : 'text-[#2E2733]'
                }`}
              >
                {formatCurrency(remaining, symbol)}
              </p>

              <div className="mt-2.5 flex items-center gap-3 border-t border-[#E7D6C4] pt-2">
                <span className="font-sans text-[11px] font-semibold text-[#486A66]">
                  + {formatCurrency(received, symbol)}
                </span>
                <span className="font-sans text-[11px] font-semibold text-[#7A4A44]">
                  – {formatCurrency(spent, symbol)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create wallet modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-end xs:items-center justify-center bg-[#4A3E52]/40 p-3 xs:p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] border border-[#D8C3B3] bg-[#F1EBE4] shadow-[0_24px_64px_rgba(74,62,82,0.22)]">
            <div className="flex items-center justify-between border-b border-[#E7D6C4] px-5 py-4">
              <div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A929E]">
                  Independent card
                </p>
                <h3 className="mt-0.5 font-sans text-[18px] font-bold tracking-tight text-[#2E2733]">
                  New card
                </h3>
              </div>
              <button
                onClick={() => setCreating(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#D8C3B3] bg-white text-[#635B6B] hover:text-[#2E2733] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div>
                <label className={labelCls}>Card name</label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="e.g. Brother's fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Opening amount <span className="font-normal text-[#9A929E]">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 10000"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Note <span className="font-normal text-[#9A929E]">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="What is this money for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Colour</label>
                <div className="flex flex-wrap gap-2">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Colour ${c}`}
                      className={`h-8 w-8 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c ? 'border-[#2E2733] scale-110' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-[#E4C4BC] bg-[#F3E1DC] px-3.5 py-2 font-sans text-[12px] font-semibold text-[#7A4A44]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-[#8C7C91] py-3 font-sans text-[13px] font-bold tracking-tight text-white hover:bg-[#776877] active:scale-[0.99] transition-all cursor-pointer"
              >
                Create card
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════ Single wallet detail ══════════════════ */
const WalletDetail: React.FC<{ walletId: string }> = ({ walletId }) => {
  const {
    specialWallets,
    specialFund,
    addSpecialEntry,
    updateSpecialEntry,
    deleteSpecialEntry,
    deleteWallet,
    updateWallet,
    setActiveWalletId,
    settings,
    showToast,
  } = useApp();

  const symbol = settings?.currencySymbol ?? '৳';
  const wallet = specialWallets.find((w) => w.id === walletId);
  const summary = useMemo(() => getWalletSummary(specialFund, walletId), [specialFund, walletId]);

  const [modalKind, setModalKind] = useState<SpecialEntryKind | null>(null);
  const [editing, setEditing] = useState<SpecialFundEntry | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(wallet?.name ?? '');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!wallet) {
    return (
      <div className="rounded-2xl border border-[#D8C3B3] bg-white/70 p-6 text-center">
        <p className="font-sans text-[13px] text-[#635B6B]">This card no longer exists.</p>
        <button
          onClick={() => setActiveWalletId(null)}
          className="mt-3 rounded-full bg-[#8C7C91] px-4 py-2 font-sans text-[12px] font-bold text-white cursor-pointer"
        >
          Back to cards
        </button>
      </div>
    );
  }

  const openAdd = (kind: SpecialEntryKind) => {
    setEditing(null);
    setModalKind(kind);
    setTitle('');
    setAmount('');
    setNote('');
    setDate(todayLocal());
    setError('');
  };

  const openEdit = (entry: SpecialFundEntry) => {
    setEditing(entry);
    setModalKind(entry.kind);
    setTitle(entry.title);
    setAmount(String(entry.amount));
    setNote(entry.note ?? '');
    setDate(entry.date);
    setError('');
  };

  const closeModal = () => {
    setModalKind(null);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalKind) return;
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      setError('Please enter a title and an amount greater than 0.');
      return;
    }
    // When spending, check against the balance excluding the entry being edited.
    if (modalKind === 'spend') {
      const previous = editing && editing.kind === 'spend' ? editing.amount : 0;
      const available = summary.remaining + previous;
      if (num > available) {
        setError(`Not enough in this card. Available is ${formatCurrency(available, symbol)}.`);
        return;
      }
    }
    const [y, m] = date.split('-').map(Number);
    const payload = {
      kind: modalKind,
      title: title.trim(),
      amount: num,
      date,
      month: (m || 1) - 1,
      year: y || new Date().getFullYear(),
      note: note.trim() || undefined,
    };

    if (editing) {
      updateSpecialEntry(editing.id, payload);
      showToast('Entry updated');
    } else {
      addSpecialEntry({ walletId, ...payload });
      showToast(
        modalKind === 'deposit'
          ? `${formatCurrency(num, symbol)} added to ${wallet.name}`
          : `${formatCurrency(num, symbol)} spent from ${wallet.name}`
      );
    }
    closeModal();
  };

  const handleDeleteWallet = () => {
    if (window.confirm(`Delete “${wallet.name}” and all its entries?`)) {
      deleteWallet(wallet.id);
      showToast('Card deleted');
    }
  };

  const saveRename = () => {
    if (nameDraft.trim()) {
      updateWallet(wallet.id, { name: nameDraft.trim() });
      showToast('Card renamed');
    }
    setRenaming(false);
  };

  const isDeposit = modalKind === 'deposit';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Back */}
      <button
        onClick={() => setActiveWalletId(null)}
        className="inline-flex items-center gap-1 rounded-full border border-[#D8C3B3] bg-white/70 px-3 py-1.5 font-sans text-[12px] font-bold text-[#635B6B] hover:text-[#2E2733] cursor-pointer"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All cards
      </button>

      {/* Wallet card */}
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] p-4 shadow-md border border-white/5">
        <div
          className="pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 rounded-full blur-3xl"
          style={{ backgroundColor: `${wallet.color}33` }}
        />

        <div className="relative flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: wallet.color }}
            />
            <div className="min-w-0">
              {renaming ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-sans text-[15px] font-extrabold text-white focus:outline-none"
                />
              ) : (
                <h1 className="truncate font-sans text-[17px] font-extrabold tracking-tight text-white leading-none">
                  {wallet.name}
                </h1>
              )}
              {wallet.note && !renaming && (
                <p className="mt-1 truncate font-sans text-[11px] text-[#9A8F9E]">{wallet.note}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => {
                setNameDraft(wallet.name);
                setRenaming(true);
              }}
              aria-label="Rename card"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-[#9A8F9E] hover:text-white cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDeleteWallet}
              aria-label="Delete card"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-[#9A8F9E] hover:text-[#FB7185] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="relative rounded-[14px] border border-white/10 bg-white/[0.04] px-3.5 py-3.5">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A8F9E]">
            Remaining Balance
          </p>
          <p
            className={`mt-1 font-sans text-[28px] font-black tracking-tight leading-none ${
              summary.remaining < 0 ? 'text-[#FB7185]' : 'text-white'
            }`}
          >
            {formatCurrency(summary.remaining, symbol)}
          </p>

          <div className="my-2.5 h-px bg-white/10" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[#9A8F9E]">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span className="font-sans text-[11px] font-bold">Received</span>
              </div>
              <p className="mt-0.5 font-sans text-[15px] font-black text-[#34D399] truncate">
                {formatCurrency(summary.received, symbol)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[#9A8F9E]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="font-sans text-[11px] font-bold">Spent</span>
              </div>
              <p className="mt-0.5 font-sans text-[15px] font-black text-[#FB7185] truncate">
                {formatCurrency(summary.spent, symbol)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative mt-3 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => openAdd('deposit')}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 py-2.5 font-sans text-[12.5px] font-bold text-[#34D399] hover:bg-[#34D399]/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Money
          </button>
          <button
            onClick={() => openAdd('spend')}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#FB7185]/15 border border-[#FB7185]/30 py-2.5 font-sans text-[12.5px] font-bold text-[#FB7185] hover:bg-[#FB7185]/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Minus className="h-4 w-4" /> Spend
          </button>
        </div>
      </div>

      {/* History */}
      <div className="rounded-[18px] border border-white/80 bg-white/85 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-[14px] font-bold text-[#2E2733]">Transactions</h2>
          <span className="font-sans text-[11px] font-medium text-[#9A929E]">
            {summary.history.length} {summary.history.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {summary.history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8C3B3] bg-[#F7F1E8] px-4 py-8 text-center">
            <p className="font-sans text-[13px] font-semibold text-[#2E2733]">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-[32ch] font-sans text-[12px] leading-[1.5] text-[#635B6B]">
              Use “Add Money” for what you received, and “Spend” for every expense from this card.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7D6C4]">
            {summary.history.map((entry) => {
              const dep = entry.kind === 'deposit';
              return (
                <div key={entry.id} className="flex items-center gap-2.5 py-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                      dep
                        ? 'border-[#C6DAD6] bg-[#E4EEEC] text-[#486A66]'
                        : 'border-[#E4C4BC] bg-[#F3E1DC] text-[#7A4A44]'
                    }`}
                  >
                    {dep ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13px] font-semibold text-[#2E2733]">
                      {entry.title}
                    </p>
                    <p className="truncate font-sans text-[11px] text-[#9A929E]">
                      {formatDateLabel(entry.date)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 font-sans text-[13px] font-bold tabular-nums ${
                      dep ? 'text-[#486A66]' : 'text-[#7A4A44]'
                    }`}
                  >
                    {dep ? '+' : '–'} {formatCurrency(entry.amount, symbol)}
                  </span>

                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => openEdit(entry)}
                      aria-label={`Edit ${entry.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#C4AB94] hover:bg-[#EAE3EC] hover:text-[#8C7C91] transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSpecialEntry(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#C4AB94] hover:bg-[#F3E1DC] hover:text-[#B0736A] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit entry modal */}
      {modalKind && (
        <div className="fixed inset-0 z-50 flex items-end xs:items-center justify-center bg-[#4A3E52]/40 p-3 xs:p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] border border-[#D8C3B3] bg-[#F1EBE4] shadow-[0_24px_64px_rgba(74,62,82,0.22)]">
            <div className="flex items-center justify-between border-b border-[#E7D6C4] px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A929E]">
                  {wallet.name}
                </p>
                <h3 className="mt-0.5 font-sans text-[18px] font-bold tracking-tight text-[#2E2733]">
                  {editing ? 'Edit entry' : isDeposit ? 'Add money' : 'Spend from card'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#D8C3B3] bg-white text-[#635B6B] hover:text-[#2E2733] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {!isDeposit && (
                <div className="rounded-xl border border-[#E7D6C4] bg-white/70 px-3.5 py-2.5 font-sans text-[12px] text-[#635B6B]">
                  Available:{' '}
                  <span className="font-bold text-[#2E2733]">
                    {formatCurrency(
                      summary.remaining + (editing && editing.kind === 'spend' ? editing.amount : 0),
                      symbol
                    )}
                  </span>
                </div>
              )}

              <div>
                <label className={labelCls}>{isDeposit ? 'From / Reason' : 'Purpose'}</label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder={isDeposit ? 'e.g. Brother — special work' : 'e.g. Gave to a friend'}
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
                    min="1"
                    required
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

              {error && (
                <p role="alert" className="rounded-xl border border-[#E4C4BC] bg-[#F3E1DC] px-3.5 py-2 font-sans text-[12px] font-semibold text-[#7A4A44]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={`w-full rounded-full py-3 font-sans text-[13px] font-bold tracking-tight text-white active:scale-[0.99] transition-all cursor-pointer ${
                  isDeposit ? 'bg-[#6D8F8A] hover:bg-[#587471]' : 'bg-[#B0736A] hover:bg-[#97615A]'
                }`}
              >
                {editing ? 'Save changes' : isDeposit ? 'Save deposit' : 'Save spending'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════ Entry point ══════════════════ */
export const SpecialFundView: React.FC = () => {
  const { activeWalletId } = useApp();
  return activeWalletId ? <WalletDetail walletId={activeWalletId} /> : <WalletList />;
};
