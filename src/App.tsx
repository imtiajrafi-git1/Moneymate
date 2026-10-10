import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { MoreMenu } from './components/common/MoreMenu';
import { PinLockScreen } from './components/common/PinLockScreen';
import { QuickAddModal } from './components/common/QuickAddModal';
import { Toast } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { MonthlyView } from './components/monthly/MonthlyView';
import { UniversityView } from './components/university/UniversityView';
import { SpecialFundView } from './components/special/SpecialFundView';
import { MonthlyReportView } from './components/reports/MonthlyReportView';
import { YearlyReportView } from './components/reports/YearlyReportView';
import { SettingsView } from './components/settings/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab, isLocked, isSecurityLoading } = useApp();

  return (
    <div className="mm-app min-h-screen text-[#2E2733] flex flex-col font-sans pb-24">
      {/* Security Overlay */}
      <PinLockScreen />

      {/* App Content rendered only when unlocked or blurred behind overlay */}
      {!isLocked && !isSecurityLoading && (
        <>
          <Header />

          <main className="mm-main container w-full transition-all">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'monthly' && <MonthlyView />}
            {activeTab === 'university' && <UniversityView />}
            {activeTab === 'special' && <SpecialFundView />}
            {activeTab === 'reports-monthly' && <MonthlyReportView />}
            {activeTab === 'reports-yearly' && <YearlyReportView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          <BottomNav />
          <MoreMenu />
          <QuickAddModal />
          <Toast />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
