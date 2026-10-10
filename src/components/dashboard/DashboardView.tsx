import React from 'react';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { UniversitySummaryCard } from './UniversitySummaryCard';
import { SpecialFundSummaryCard } from './SpecialFundSummaryCard';
import { RecentActivity } from './RecentActivity';

export const DashboardView: React.FC = () => {
  return (
    <div className="mm-dashboard mx-auto flex w-full max-w-2xl flex-col gap-6 animate-in fade-in duration-200">
      <MonthlySummaryCard />

      <UniversitySummaryCard />

      <SpecialFundSummaryCard />

      <RecentActivity />
    </div>
  );
};
