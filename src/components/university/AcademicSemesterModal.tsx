import { useId, useState } from 'react';
import { BookOpen, Bus, FileText, Layers, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AcademicFeeType, Semester } from '../../types';
import { ACADEMIC_FEE_TYPES, getSemesterFees, newAcademicId } from '../../utils/academic';
import { formatCurrency } from '../../utils/formatters';
import { AcademicDialog } from './AcademicDialog';

const icons = { 'Registration Fee': BookOpen, 'Final Exam Fee': FileText, 'Transport Fee': Bus, 'Other Fee': Layers };

export function AcademicSemesterModal({ semester, onClose, onSaved }: {
  semester?: Semester; onClose: () => void; onSaved: (semester: Semester) => void;
}) {
  const { saveAcademicSemester, settings, showToast } = useApp();
  const formId = useId();
  const initialFees = semester ? getSemesterFees(semester) : [];
  const [name, setName] = useState(semester?.name ?? '');
  const [status, setStatus] = useState<Semester['status']>(semester?.status ?? 'Active');
  const [fees, setFees] = useState(() => ACADEMIC_FEE_TYPES.map((category) => ({
    category, id: initialFees.find((fee) => fee.category === category)?.id ?? newAcademicId(),
    amount: String(initialFees.find((fee) => fee.category === category)?.amount ?? ''),
    dueDate: initialFees.find((fee) => fee.category === category)?.dueDate ?? '',
  })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = fees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
  const changeFee = (category: AcademicFeeType, key: 'amount' | 'dueDate', value: string) => setFees((previous) => previous.map((fee) => fee.category === category ? { ...fee, [key]: value } : fee));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const saved = await saveAcademicSemester({ id: semester?.id, name, status, totalFee: total,
        fees: fees.map((fee) => ({ id: fee.id, category: fee.category, amount: Number(fee.amount || 0), dueDate: fee.dueDate || undefined })),
      });
      showToast(semester ? 'Semester fees updated.' : 'Semester created.');
      onSaved(saved);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this semester.'); }
    finally { setBusy(false); }
  };

  return (
    <AcademicDialog title={semester ? 'Edit semester fees' : 'Add a semester'} subtitle="Set the required fees. Record payments separately." onClose={onClose} busy={busy}>
      <form className="academic-form" onSubmit={(event) => void submit(event)}>
        <div className="academic-form-grid">
          <label htmlFor={`${formId}-name`}>Semester name<input id={`${formId}-name`} autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Spring 2025" /></label>
          <label htmlFor={`${formId}-status`}>Semester status<select id={`${formId}-status`} value={status} onChange={(event) => setStatus(event.target.value as Semester['status'])}><option>Active</option><option>Completed</option><option>Upcoming</option></select></label>
        </div>
        <div className="academic-form-section-title"><span>Required fee breakdown</span><span>Amount in {settings.currencySymbol}</span></div>
        <div className="academic-fee-inputs">
          {fees.map((fee) => {
            const Icon = icons[fee.category];
            return <div className="academic-fee-input-row" key={fee.category}>
              <div className="academic-fee-input-label"><Icon size={18} /><label htmlFor={`${formId}-${fee.id}`}>{fee.category}<span>{fee.category === 'Other Fee' ? 'Optional additional or legacy fees' : 'Enter the amount required'}</span></label></div>
              <input id={`${formId}-${fee.id}`} aria-label={`${fee.category} required amount`} inputMode="decimal" type="number" min="0" max="9999999999" step="0.01" placeholder="0" value={fee.amount} onChange={(event) => changeFee(fee.category, 'amount', event.target.value)} />
              <label className="academic-due-input">Due date <span>(optional)</span><input aria-label={`${fee.category} due date`} type="date" value={fee.dueDate} onChange={(event) => changeFee(fee.category, 'dueDate', event.target.value)} /></label>
            </div>;
          })}
        </div>
        <div className="academic-form-total"><span>Total Required Fee</span><strong>{formatCurrency(total, settings.currencySymbol)}</strong></div>
        {semester && !semester.fees?.length && <p className="academic-form-hint">Your original total is preserved under Other Fee. Allocate it to the correct categories here.</p>}
        {error && <p className="academic-error" role="alert">{error}</p>}
        <div className="academic-form-actions"><button className="academic-button secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="academic-button primary" type="submit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Saving...' : semester ? 'Save changes' : 'Create semester'}</button></div>
      </form>
    </AcademicDialog>
  );
}