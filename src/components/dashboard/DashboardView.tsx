import React from 'react';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { UniversitySummaryCard } from './UniversitySummaryCard';
import { SpecialFundSummaryCard } from './SpecialFundSummaryCard';
import { RecentActivity } from './RecentActivity';

export const DashboardView: React.FC = () => {
  return (
    <div className="mm-dashboard animate-in fade-in duration-200">
      {/*
        Three independent wallets, each with its own data:
          1. Monthly   — pocket money (monthly income & expense)
          2. University — semester / academic payments
          3. Special Fund — "Others" wallet (own deposits, own spending)
        Mobile / Tablet / Desktop  -> stacks vertically
        Wide Desktop (1200px+)     -> Monthly + University side by side
      */}
      <div className="mm-dash-primary">
        {/* Priority 1: Monthly Summary Card */}
        <MonthlySummaryCard />

        {/* Priority 2: University Summary Card */}
        <UniversitySummaryCard />
      </div>

      {/* Priority 3: Others / Special Fund wallet */}
      <SpecialFundSummaryCard />

      {/* Priority 4: Recent Activity — always full width */}
      <RecentActivity />
    </div>
  );
};
