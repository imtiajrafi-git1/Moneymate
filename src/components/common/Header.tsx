import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Plus } from 'lucide-react';
import { LOGO_URL } from '../../utils/brand';

export const Header: React.FC = () => {
  const { settings, lockApp, openAddModal, activeTab } = useApp();
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="mm-header sticky top-0 z-30">
      <div className="mm-header-inner container flex items-center justify-between py-3.5 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-[10px] overflow-hidden bg-[#8C7C91] text-[#F1EBE4] flex items-center justify-center shadow-sm shrink-0">
            {!logoFailed ? (
              <img src={LOGO_URL} alt="MoneyMate logo" onError={() => setLogoFailed(true)} className="h-full w-full object-cover" loading="eager" />
            ) : (
              <span className="font-display text-[16px] sm:text-[18px] leading-none tracking-[-0.02em]">M</span>
            )}
          </div>
          <div className="leading-tight">
            <h1 className="font-sans text-[19px] sm:text-[21px] font-extrabold tracking-tight text-[#2E2733] leading-none">MoneyMate</h1>
            <p className="mm-brand-sub font-sans text-[13px] sm:text-[14px] font-bold text-[#635B6B]">
              Hi, {settings.userName || 'Imtiaj Rafi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => openAddModal(activeTab === 'university' ? 'university' : 'expense')} aria-label={activeTab === 'university' ? 'Record academic payment' : 'Add transaction'} className="group inline-flex items-center gap-1.5 rounded-full bg-[#8C7C91] px-3.5 py-2 text-[12px] sm:text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_4px_12px_rgba(74,62,82,0.18)] transition-all hover:bg-[#776877] active:scale-[0.98]">
            <Plus className="h-3.5 w-3.5 transition-transform group-active:rotate-90" />
            <span className="hidden sm:inline">{activeTab === 'university' ? 'Record payment' : 'New entry'}</span>
            <span className="sm:hidden">{activeTab === 'university' ? 'Pay' : 'Add'}</span>
          </button>
          {settings.isPinEnabled && (
            <button onClick={lockApp} aria-label="Lock application" title="Lock App" className="h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-full border border-[#D8C3B3] bg-white/70 text-[#635B6B] backdrop-blur-sm transition-colors hover:text-[#2E2733] hover:border-[#C4AB94] cursor-pointer">
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
