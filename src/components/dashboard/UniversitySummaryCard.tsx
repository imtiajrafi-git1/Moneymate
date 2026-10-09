import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getUniversityTotal } from '../../utils/finance';
import { formatCurrency } from '../../utils/formatters';

export const UniversitySummaryCard: React.FC = () => {
  const { universityPayments, expenses, settings, setActiveTab } = useApp();
  const totalUniPaid = useMemo(
    () => getUniversityTotal(universityPayments, expenses),
    [universityPayments, expenses]
  );
  const symbol = settings?.currencySymbol ?? '৳';

  return (
    <button
      onClick={() => setActiveTab('university')}
      aria-label="Open University payments"
      className="group w-full text-left bg-gradient-to-br from-[#2D2436] via-[#211A28] to-[#17121C] rounded-[16px] xs:rounded-[18px] p-3 xs:p-4 relative overflow-hidden cursor-pointer shadow-md border border-white/5 transition-all hover:shadow-lg"
    >
      {/* Glow accents */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 bg-[#8C7C91]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-28 w-28 bg-[#85A8A3]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5 xs:mb-3 relative">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full bg-[#85A8A3] shrink-0 animate-pulse shadow-[0_0_9px_rgba(133,168,163,0.7)]" />
            <p className="font-sans text-[11px] xs:text-[12px] font-black uppercase tracking-[0.11em] text-[#9A8F9E] leading-none">
              Academic
            </p>
          </div>
          <h2 className="mt-1.5 font-sans text-[14px] xs:text-[17px] font-extrabold tracking-tight text-white leading-none">
            University
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-2.5 py-1 font-sans text-[10px] font-bold text-[#9A8F9E]">
          Σ Total
        </div>
      </div>

      {/* Value block */}
      <div className="rounded-[12px] xs:rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-3 xs:px-3.5 xs:py-3.5 relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-[10px] xs:text-[11px] font-bold uppercase tracking-[0.08em] text-[#9A8F9E]">
            Total Paid
          </span>
          <span className="font-sans text-[19px] xs:text-[25px] font-black tracking-tight text-white leading-none">
            {formatCurrency(totalUniPaid, symbol)}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between relative">
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-[#9A8F9E]/70">
          {universityPayments.length === 0
            ? 'No records yet'
            : `${universityPayments.length} payments · all semesters`}
        </span>
        <span className="font-sans text-[10px] xs:text-[11px] font-bold text-white opacity-70 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </button>
  );
};
