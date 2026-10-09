import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Small confirmation shown after an entry is saved, so the user can see it worked. */
export const Toast: React.FC = () => {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] w-[calc(100%-1.5rem)] max-w-sm"
    >
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#211A28] px-3.5 py-3 text-white shadow-[0_16px_40px_-8px_rgba(23,18,28,0.6)] border border-white/10">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#34D399]" />
        <p className="flex-1 font-sans text-[12.5px] font-semibold leading-snug">{toast.message}</p>
        <button
          onClick={dismissToast}
          aria-label="Dismiss"
          className="grid h-6 w-6 place-items-center rounded-full text-[#9A8F9E] hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
