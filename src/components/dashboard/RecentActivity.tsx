import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getRecentActivities } from '../../utils/finance';
import { formatCurrency, formatDateLabel } from '../../utils/formatters';
import {
  Utensils,
  Bus,
  GraduationCap,
  ShoppingBag,
  Receipt,
  Tv,
  HeartPulse,
  DollarSign,
  ArrowDownLeft,
  Trash2,
  ListFilter,
  Plus,
  Home,
} from 'lucide-react';
import { UnifiedActivity } from '../../types';

export const RecentActivity: React.FC = () => {
  const {
    incomes,
    expenses,
    universityPayments,
    settings,
    deleteExpense,
    deleteIncome,
    deleteUniversityPayment,
    openAddModal,
    showToast,
  } = useApp();

  const [limit, setLimit] = useState(7);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const allActivities = useMemo(
    () => getRecentActivities(incomes, expenses, universityPayments, 20),
    [incomes, expenses, universityPayments]
  );
  const activities = useMemo(() => allActivities.slice(0, limit), [allActivities, limit]);
  const hasMoreActivities = allActivities.length > 7;

  const handleActivityToggle = () => {
    setIsActivityOpen((prev) => !prev);
    if (hasMoreActivities) setLimit((prev) => (prev === 7 ? 20 : 7));
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (type === 'income') return <DollarSign className="h-3.5 w-3.5" />;
    if (type === 'university' || category === 'University') return <GraduationCap className="h-3.5 w-3.5" />;
    switch (category) {
      case 'Food': return <Utensils className="h-3.5 w-3.5" />;
      case 'Transport': return <Bus className="h-3.5 w-3.5" />;
      case 'Shopping': return <ShoppingBag className="h-3.5 w-3.5" />;
      case 'House Rent': return <Home className="h-3.5 w-3.5" />;
      case 'Bills': return <Receipt className="h-3.5 w-3.5" />;
      case 'Entertainment': return <Tv className="h-3.5 w-3.5" />;
      case 'Health': return <HeartPulse className="h-3.5 w-3.5" />;
      default: return <ArrowDownLeft className="h-3.5 w-3.5" />;
    }
  };

  const getCategoryStyle = (category: string, type: string) => {
    if (type === 'income') return 'bg-[#10B981]/15 text-[#34D399] border-[#34D399]/25';
    if (type === 'university' || category === 'University')
      return 'bg-[#8C7C91]/20 text-[#C0B3C4] border-[#C0B3C4]/25';
    switch (category) {
      case 'Food': return 'bg-[#F59E0B]/15 text-[#FBBF77] border-[#FBBF77]/25';
      case 'Transport': return 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#93C5FD]/25';
      case 'Shopping': return 'bg-[#8C7C91]/20 text-[#C0B3C4] border-[#C0B3C4]/25';
      case 'House Rent': return 'bg-[#85A8A3]/15 text-[#7FCFC6] border-[#7FCFC6]/25';
      case 'Bills': return 'bg-[#FB7185]/15 text-[#FDA4AF] border-[#FDA4AF]/25';
      default: return 'bg-white/[0.06] text-[#9A8F9E] border-white/10';
    }
  };

  const handleDelete = (act: UnifiedActivity) => {
    if (act.type === 'income') deleteIncome(act.id);
    else if (act.type === 'university') void deleteUniversityPayment(act.id).catch((cause: unknown) => showToast(cause instanceof Error ? cause.message : 'Payment could not be deleted.'));
    else deleteExpense(act.id);
  };

  return (
    <div className="bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] rounded-[16px] xs:rounded-[18px] p-3 xs:p-4 relative overflow-hidden shadow-md border border-white/5">
      {/* Glow accents */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 bg-[#8C7C91]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5 xs:mb-3 relative">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full bg-[#10B981] shrink-0 animate-pulse shadow-[0_0_9px_rgba(16,185,129,0.7)]" />
            <p className="font-sans text-[11px] xs:text-[12px] font-extrabold uppercase tracking-[0.11em] text-[#9A8F9E]">
              Timeline
            </p>
          </div>
          <h2 className="mt-1.5 font-sans text-[14px] xs:text-[17px] font-extrabold tracking-tight text-white leading-none">
            Recent activity
          </h2>
          <p className="mt-1 font-sans text-[10px] xs:text-[11px] text-[#9A8F9E]/70 font-bold">
            {allActivities.length} records
          </p>
        </div>

        {allActivities.length > 0 && (
          <button
            onClick={handleActivityToggle}
            aria-label={isActivityOpen ? 'Hide recent activity' : 'Show recent activity'}
            aria-expanded={isActivityOpen}
            title={isActivityOpen ? 'Hide Activity' : 'View All'}
            className={`h-8 w-8 xs:h-9 xs:w-9 grid place-items-center rounded-full border transition-all active:scale-[0.96] cursor-pointer shrink-0 ${
              isActivityOpen || limit > 7
                ? 'bg-white text-[#211A28] border-white shadow-sm'
                : 'bg-white/5 border-white/15 text-[#9A8F9E] hover:text-white hover:border-white/30'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {allActivities.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-white/15 bg-white/[0.04] px-4 py-10 text-center relative">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#9A8F9E] mb-3">
            <ListFilter className="h-4 w-4" />
          </div>
          <p className="font-sans text-[15px] font-extrabold text-white">Quiet ledger</p>
          <p className="mx-auto mt-1 max-w-[22ch] font-sans text-[12px] leading-[1.5] text-[#9A8F9E] font-medium">
            Your recent expenses, incomes, and university payments will appear here.
          </p>
          <button
            onClick={() => openAddModal('expense')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-sans text-[12px] font-bold text-[#211A28] hover:bg-[#E8DFEC] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add first entry
          </button>
        </div>
      ) : (
        <div className={`${isActivityOpen ? 'block' : 'hidden xs:block'} relative`}>
          <div className="relative">
            <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-white/10 hidden xs:block" />
            <div className="divide-y divide-white/10 xs:divide-y-0">
              {activities.map((act) => {
                const isIncome = act.type === 'income';
                return (
                  <div
                    key={act.id}
                    className="group relative flex items-center gap-3 py-3 xs:py-3.5 px-0 xs:pl-11 xs:pr-2 xs:rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    {/* Timeline dot */}
                    <span className="hidden xs:block absolute left-[14px] top-[20px] h-2 w-2 rounded-full bg-[#211A28] border border-white/25 group-hover:border-[#10B981] transition-colors" />

                    {/* Icon */}
                    <div
                      className={`h-8 w-8 xs:h-9 xs:w-9 shrink-0 grid place-items-center rounded-full border ${getCategoryStyle(
                        act.category,
                        act.type
                      )}`}
                    >
                      {getCategoryIcon(act.category, act.type)}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <p className="font-sans text-[13px] xs:text-[13.5px] font-bold tracking-[-0.01em] text-white truncate">
                          {act.title}
                        </p>
                        <span className="hidden xs:inline font-sans text-[11px] text-[#9A8F9E] font-semibold truncate">
                          {act.category}
                        </span>
                      </div>
                      <p className="font-sans text-[11px] xs:text-[11.5px] text-[#9A8F9E]/70 mt-0.5 font-medium">
                        {formatDateLabel(act.date)}
                        {act.note ? <span className="hidden xs:inline"> · {act.note}</span> : null}
                      </p>
                    </div>

                    {/* Amount + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-sans text-[13px] xs:text-[13.5px] font-bold tracking-[-0.01em] tabular-nums ${
                          isIncome ? 'text-[#34D399]' : 'text-white'
                        }`}
                      >
                        {isIncome ? '+' : '–'} {formatCurrency(act.amount, settings.currencySymbol)}
                      </span>
                      <button
                        onClick={() => handleDelete(act)}
                        aria-label={`Delete ${act.title}`}
                        className="grid h-7 w-7 place-items-center rounded-full text-[#9A8F9E]/50 hover:text-[#FB7185] hover:bg-[#FB7185]/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMoreActivities && (
            <div className="mt-3 flex items-center justify-center">
              <span className="font-sans text-[11px] text-[#9A8F9E]/70 font-medium">
                {limit === 7 ? `${allActivities.length - 7} more hidden` : 'Showing all'} · tap ⊞ to toggle
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
