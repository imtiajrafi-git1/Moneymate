import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, BarChart3, TrendingUp, Gift, X } from 'lucide-react';
import { ActiveTab } from '../../types';

export const MoreMenu: React.FC = () => {
  const { isMoreMenuOpen, setIsMoreMenuOpen, setActiveTab, activeTab } = useApp();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen, setIsMoreMenuOpen]);

  if (!isMoreMenuOpen) return null;

  const navigateAndClose = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end xs:items-center justify-center bg-[#4A3E52]/30 backdrop-blur-[6px] p-3">
      <div ref={menuRef} className="w-full max-w-[400px] rounded-[20px] bg-[#F1EBE4] border border-[#D8C3B3] shadow-[0_24px_64px_rgba(74,62,82,0.22)] overflow-hidden animate-[in_.2s_ease]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7D6C4]">
          <div>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A929E]">Navigation</p>
            <p className="font-display text-[18px] tracking-[-0.02em] text-[#2E2733]">More</p>
          </div>
          <button
            onClick={() => setIsMoreMenuOpen(false)}
            aria-label="Close menu"
            className="h-8 w-8 grid place-items-center rounded-full border border-[#D8C3B3] bg-white text-[#635B6B] hover:text-[#2E2733] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2.5 space-y-1.5">
          {[
            { tab: 'special' as ActiveTab, icon: Gift, title: 'Others / Extra Cards', desc: 'Independent cards · own balance' },
            { tab: 'reports-monthly' as ActiveTab, icon: BarChart3, title: 'Monthly report', desc: 'Category breakdown & PDF' },
            { tab: 'reports-yearly' as ActiveTab, icon: TrendingUp, title: 'Yearly report', desc: '12-month analytics & PDF' },
            { tab: 'settings' as ActiveTab, icon: Settings, title: 'Settings', desc: 'Security, PIN & preferences' },
          ].map((item) => {
            const active = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => navigateAndClose(item.tab)}
                className={`w-full flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#8C7C91] text-white border-[#8C7C91] shadow-sm'
                    : 'bg-white border-[#E7D6C4] text-[#2E2733] hover:border-[#D8C3B3] hover:bg-[#F7F1E8]'
                }`}
              >
                <div
                  className={`h-9 w-9 grid place-items-center rounded-full border ${
                    active
                      ? 'bg-white/12 border-white/12 text-white'
                      : 'bg-[#F1EBE4] border-[#D8C3B3] text-[#635B6B]'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-[13px] font-semibold tracking-[-0.01em]">{item.title}</p>
                  <p className={`font-sans text-[11px] ${active ? 'text-white/70' : 'text-[#635B6B]'}`}>{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-[#E7D6C4] flex items-center justify-between">
          <span className="font-sans text-[11px] text-[#9A929E]">MoneyMate · v2 · Editorial</span>
          <span className="font-sans text-[11px] font-medium text-[#635B6B]">Tap outside to close</span>
        </div>
      </div>

      <style>{`@keyframes in { from { opacity:0; transform: translateY(16px) scale(0.98);} to { opacity:1; transform: translateY(0) scale(1);} }`}</style>
    </div>
  );
};
