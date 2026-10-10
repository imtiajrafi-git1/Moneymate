import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Delete, Loader2, ShieldAlert } from 'lucide-react';
import { LOGO_URL } from '../../utils/brand';

export const PinLockScreen: React.FC = () => {
  const { isLocked, isSecurityLoading, unlockApp } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const [logoFailed, setLogoFailed] = useState(false);

  if (!isLocked && !isSecurityLoading) return null;

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4 || checkingRef.current) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      checkingRef.current = true;
      setChecking(true);
      try {
        const success = await unlockApp(newPin);
        if (!success) {
          setError('Incorrect PIN. Try again.');
          setTimeout(() => setPin(''), 500);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not verify PIN. Check your connection.');
        setTimeout(() => setPin(''), 800);
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[linear-gradient(135deg,#F5EFE8_0%,#F1EBE4_45%,#EADFD1_100%)]">
      <div className="w-full max-w-[320px] rounded-[24px] bg-white/85 backdrop-blur-xl border border-[#D8C3B3] p-6 shadow-[0_24px_64px_rgba(74,62,82,0.18),0_1px_0_rgba(255,255,255,0.95)_inset] text-center flex flex-col items-center">
        {/* Logo */}
        <div className="h-14 w-14 rounded-[16px] overflow-hidden bg-[#8C7C91] flex items-center justify-center text-white mb-4 shadow-sm">
          {!logoFailed ? (
            <img
              src={LOGO_URL}
              alt="MoneyMate logo"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Lock className="h-6 w-6" />
          )}
        </div>

        {/* Brand */}
        <h2 className="font-display text-[22px] leading-none tracking-[-0.02em] text-[#2E2733]">
          MoneyMate
        </h2>

        {/* Credit */}
        <p className="mt-1.5 font-sans text-[11px] font-medium text-[#9A929E]">
          Develop By Imtiaj Rafi
        </p>

        {/* Instruction */}
        <p className="mt-4 mb-5 font-sans text-[12px] font-medium text-[#635B6B]">
          {isSecurityLoading ? 'Syncing your shared app lock...' : 'Enter your 4-digit PIN'}
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 mb-5">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`h-3 w-3 rounded-full border transition-all duration-150 ${
                  error
                    ? 'border-[#B0736A] bg-[#B0736A]'
                    : isFilled
                    ? 'border-[#8C7C91] bg-[#8C7C91] scale-110'
                    : 'border-[#D8C3B3] bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-[#7A4A44] font-sans text-[11px] font-semibold mb-4 bg-[#F3E1DC] px-3 py-1.5 rounded-full border border-[#E4C4BC]">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        {isSecurityLoading && <Loader2 className="mb-4 h-5 w-5 animate-spin text-[#8C7C91]" aria-label="Loading shared app lock" />}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => void handleKeyPress(digit)}
              disabled={checking || isSecurityLoading}
              aria-label={`Digit ${digit}`}
              className="h-12 rounded-full font-sans text-[17px] font-semibold text-[#2E2733] bg-white/80 border border-[#E7D6C4] hover:bg-white hover:border-[#C4AB94] active:scale-[0.96] transition-all flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={checking || isSecurityLoading}
            aria-label="Clear PIN input"
            className="h-12 rounded-full font-sans text-[11px] font-semibold text-[#635B6B] bg-transparent hover:bg-white hover:text-[#2E2733] transition-colors flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => void handleKeyPress('0')}
            disabled={checking || isSecurityLoading}
            aria-label="Digit 0"
            className="h-12 rounded-full font-sans text-[17px] font-semibold text-[#2E2733] bg-white/80 border border-[#E7D6C4] hover:bg-white hover:border-[#C4AB94] active:scale-[0.96] transition-all flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={checking || isSecurityLoading}
            aria-label="Backspace"
            className="h-12 rounded-full text-[#635B6B] bg-transparent hover:bg-white hover:text-[#2E2733] transition-colors flex items-center justify-center cursor-pointer"
          >
            <Delete className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
