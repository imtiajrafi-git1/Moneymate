import React from 'react';
import { useApp } from '../../context/AppContext';
import { CloudOff } from 'lucide-react';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { UniversitySummaryCard } from './UniversitySummaryCard';
import { SpecialFundSummaryCard } from './SpecialFundSummaryCard';
import { RecentActivity } from './RecentActivity';

export const DashboardView: React.FC = () => {
  const { academicUser, openCloudModal } = useApp();

  return (
    <div className="mm-dashboard mx-auto flex w-full max-w-2xl flex-col gap-6 animate-in fade-in duration-200">
      {!academicUser && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#fdf4e7] border border-[#eed9b8] text-[#8a6134] text-xs">
          <div className="flex items-center gap-2.5">
            <CloudOff className="h-4 w-4 text-[#b98a4e] shrink-0" />
            <div>
              <span className="font-bold">Operating in Local Mode.</span> Data is stored on this device only. Connect Supabase to sync and load cloud records.
            </div>
          </div>
          <button
            type="button"
            onClick={openCloudModal}
            className="px-3 py-1.5 rounded-lg bg-[#b98a4e] text-white font-semibold hover:bg-[#a67941] text-xs shrink-0 cursor-pointer transition-colors"
          >
            Connect Cloud
          </button>
        </div>
      )}

      <MonthlySummaryCard />

      <UniversitySummaryCard />

      <SpecialFundSummaryCard />

      <RecentActivity />
    </div>
  );
};
