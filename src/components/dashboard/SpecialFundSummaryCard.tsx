import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getAllWalletsSummary } from '../../utils/finance';
import { formatCurrency } from '../../utils/formatters';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

/** Dashboard card summarising ALL independent extra wallets. */
export const SpecialFundSummaryCard: React.FC = () => {
  const { specialWallets, specialFund, settings, setActiveTab, setActiveWalletId } = useApp();
  const totals = useMemo(
    () => getAllWalletsSummary(specialWallets, specialFund),
    [specialWallets, specialFund]
  );
  const symbol = settings?.currencySymbol ?? '৳';

  const open = () => {
    setActiveWalletId(null); // always land on the card list
    setActiveTab('special');
  };

  return (
    <button
      onClick={open}
      aria-label="Open extra cards"
      className="group w-full text-left bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] rounded-[16px] xs:rounded-[18px] p-3 xs:p-4 relative overflow-hidden cursor-pointer shadow-md border border-white/5 transition-all hover:shadow-lg"
    >
      {/* Glow accents */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 bg-[#D8C3B3]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-28 w-28 bg-[#8C7C91]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5 xs:mb-3 relative">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full bg-[#D8C3B3] shrink-0 animate-pulse shadow-[0_0_9px_rgba(216,195,179,0.7)]" />
            <p className="font-sans text-[11px] xs:text-[12px] font-black uppercase tracking-[0.11em] text-[#9A8F9E] leading-none">
              Others
            </p>
          </div>
          <h2 className="mt-1.5 font-sans text-[14px] xs:text-[17px] font-extrabold tracking-tight text-white leading-none">
            Extra Cards
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-2.5 py-1 font-sans text-[10px] font-bold text-[#9A8F9E]">
          {totals.walletCount} {totals.walletCount === 1 ? 'card' : 'cards'}
        </div>
      </div>

      {/* Combined totals across wallets (still outside monthly & university) */}
      <div className="rounded-[12px] xs:rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-3 xs:px-3.5 xs:py-3.5 relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-[10px] xs:text-[11px] font-bold uppercase tracking-[0.08em] text-[#9A8F9E]">
            Remaining
          </span>
          <span
            className={`font-sans text-[19px] xs:text-[25px] font-black tracking-tight leading-none ${
              totals.remaining < 0 ? 'text-[#FB7185]' : 'text-white'
            }`}
          >
            {formatCurrency(totals.remaining, symbol)}
          </span>
        </div>

        <div className="my-2.5 h-px bg-white/10" />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ArrowDownLeft className="h-3.5 w-3.5 text-[#9A8F9E] shrink-0" />
              <span className="font-sans text-[11px] xs:text-[12px] font-bold text-[#9A8F9E] truncate">Received</span>
            </div>
            <span className="font-sans text-[12px] xs:text-[13.5px] font-black tracking-tight text-[#34D399] truncate">
              {formatCurrency(totals.received, symbol)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#9A8F9E] shrink-0" />
              <span className="font-sans text-[11px] xs:text-[12px] font-bold text-[#9A8F9E] truncate">Spent</span>
            </div>
            <span className="font-sans text-[12px] xs:text-[13.5px] font-black tracking-tight text-[#FB7185] truncate">
              {formatCurrency(totals.spent, symbol)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between relative">
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-[#9A8F9E]/70">
          {totals.walletCount === 0 ? 'No extra card yet' : 'Not in monthly balance'}
        </span>
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-white opacity-70 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </button>
  );
};
