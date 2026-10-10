import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Lock,
  Fingerprint,
  User,
  RotateCcw,
  Check,
  ShieldCheck,
  Download,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    updateAppLockSettings,
    resetAllData,
    lockApp,
    incomes,
    expenses,
    universityPayments,
    specialFund,
    specialWallets,
    semesters,
    academicReceipts,
    academicUser,
  } = useApp();

  const [pinInput, setPinInput] = useState(academicUser ? '' : settings.pin);
  const [userNameInput, setUserNameInput] = useState(settings.userName);
  const [userEmailInput, setUserEmailInput] = useState(settings.userEmail);
  const [currencyInput, setCurrencyInput] = useState(settings.currencySymbol);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityError, setSecurityError] = useState('');

  useEffect(() => {
    setPinInput(academicUser ? '' : settings.pin);
  }, [academicUser?.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput && pinInput.length !== 4) {
      setSecurityError('PIN must contain exactly four digits.');
      return;
    }
    setSaving(true);
    setSecurityError('');
    try {
      await updateAppLockSettings(pinInput || null, settings.isPinEnabled);
      updateSettings({
        userName: userNameInput,
        userEmail: userEmailInput,
        currencySymbol: currencyInput || '৳',
      });
      if (academicUser) setPinInput('');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (cause) {
      setSecurityError(cause instanceof Error ? cause.message : 'Could not save your app lock settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePinLockChange = async (enabled: boolean) => {
    setSecurityError('');
    try {
      await updateAppLockSettings(null, enabled);
    } catch (cause) {
      setSecurityError(cause instanceof Error ? cause.message : 'Could not update your app lock setting.');
    }
  };

  const handleExportData = () => {
    const backupData = {
      settings: { ...settings, pin: '' },
      incomes,
      expenses,
      universityPayments,
      specialFund,
      specialWallets,
      semesters,
      academicReceipts,
      exportedAt: new Date().toISOString(),
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `MoneyMate-Backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="mm-glass rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Settings & Security</h1>
            <p className="text-xs text-slate-500">Configure application preferences</p>
          </div>
        </div>

        {isSaved && (
          <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-semibold">
            <Check className="h-3.5 w-3.5" />
            Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Security Section */}
        <div className="mm-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">Security & App Lock</h2>
          </div>

          {/* Toggle PIN */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4.5 w-4.5 text-slate-500" />
              <div>
                <div className="text-xs font-semibold text-slate-800">4-Digit PIN Lock</div>
                <div className="text-[11px] text-slate-400">Require PIN to unlock application</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPinEnabled}
                disabled={saving}
                onChange={(e) => void handlePinLockChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Set 4-Digit PIN */}
          {settings.isPinEnabled && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Set 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                autoComplete="new-password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder={academicUser ? 'New PIN' : undefined}
                className="w-32 px-3 py-2 text-center text-lg font-bold tracking-widest bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                {academicUser
                  ? 'Leave blank to keep your shared account PIN. A new PIN syncs to your other signed-in devices.'
                  : 'Enter four digits to change your PIN.'}
              </p>
            </div>
          )}
          {securityError && <p className="text-xs font-medium text-rose-700" role="alert">{securityError}</p>}

          {/* Toggle Biometric */}
          <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2.5">
              <Fingerprint className="h-4.5 w-4.5 text-slate-500" />
              <div>
                <div className="text-xs font-semibold text-slate-800">Biometric / WebAuthn</div>
                <div className="text-[11px] text-slate-400">Use Touch ID, Face ID, or fingerprint</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isBiometricEnabled}
                onChange={(e) => updateSettings({ isBiometricEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          <button
            type="button"
            onClick={lockApp}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Lock App Now
          </button>
        </div>

        {/* User Profile & Preferences */}
        <div className="mm-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">User Profile & Currency</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">User Name</label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">User Email</label>
              <input
                type="email"
                value={userEmailInput}
                onChange={(e) => setUserEmailInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              value={currencyInput}
              onChange={(e) => setCurrencyInput(e.target.value)}
              className="w-24 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            {saving ? 'Saving...' : 'Save Profile & Preferences'}
          </button>
        </div>

        {/* Data Management Section */}
        <div className="mm-glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
            Data Management
          </h2>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Backup JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Reset application to sample data? Existing modifications will be replaced.')) {
                  resetAllData();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
