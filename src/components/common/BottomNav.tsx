import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Calendar, GraduationCap, MoreHorizontal } from 'lucide-react';
import { ActiveTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isMoreMenuOpen, setIsMoreMenuOpen } = useApp();

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (isMoreMenuOpen) setIsMoreMenuOpen(false);
  };

  const handleMoreClick = () => setIsMoreMenuOpen(!isMoreMenuOpen);

  const isMainTabActive = (tab: ActiveTab) => !isMoreMenuOpen && activeTab === tab;
  const isMoreActive =
    isMoreMenuOpen ||
    activeTab === 'special' ||
    activeTab === 'settings' ||
    activeTab === 'reports-monthly' ||
    activeTab === 'reports-yearly';

  const base = "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-full transition-all duration-200 cursor-pointer";
  const activeCls = "bg-[#8C7C91] text-white shadow-sm";
  const inactiveCls = "text-[#8C7C91]/70 hover:text-[#4A3E52] hover:bg-white/70";

  return (
    <nav aria-label="Main Navigation" className="mm-nav fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="mm-nav-inner pointer-events-auto">
        <button
          onClick={() => handleTabClick('dashboard')}
          aria-label="Navigate to Home"
          aria-current={isMainTabActive('dashboard') ? 'page' : undefined}
          className={`${base} ${isMainTabActive('dashboard') ? activeCls : inactiveCls}`}
        >
          <Home className="h-[18px] w-[18px] sm:h-5 sm:w-5 mb-0.5" strokeWidth={isMainTabActive('dashboard') ? 2.2 : 1.8} />
          <span className="mm-nav-label text-[10px] font-semibold leading-none tracking-[-0.01em]">Home</span>
        </button>

        <button
          onClick={() => handleTabClick('monthly')}
          aria-label="Navigate to Monthly"
          className={`${base} ${isMainTabActive('monthly') ? activeCls : inactiveCls}`}
        >
          <Calendar className="h-[18px] w-[18px] sm:h-5 sm:w-5 mb-0.5" strokeWidth={isMainTabActive('monthly') ? 2.2 : 1.8} />
          <span className="mm-nav-label text-[10px] font-medium leading-none">Monthly</span>
        </button>

        <button
          onClick={() => handleTabClick('university')}
          aria-label="Navigate to University"
          className={`${base} ${isMainTabActive('university') ? activeCls : inactiveCls}`}
        >
          <GraduationCap className="h-[18px] w-[18px] sm:h-5 sm:w-5 mb-0.5" strokeWidth={isMainTabActive('university') ? 2.2 : 1.8} />
          <span className="mm-nav-label text-[10px] font-medium leading-none">University</span>
        </button>

        <button
          onClick={handleMoreClick}
          aria-label="Open More menu"
          aria-expanded={isMoreMenuOpen}
          className={`${base} ${isMoreActive ? activeCls : inactiveCls}`}
        >
          <MoreHorizontal className="h-[18px] w-[18px] sm:h-5 sm:w-5 mb-0.5" />
          <span className="mm-nav-label text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
