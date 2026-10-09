import { useEffect, useId, useState } from 'react';
import { Check, FileImage, FileText, Loader2, Paperclip, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AcademicFeeType, AcademicReceipt, PaymentMethod, UniversityPayment } from '../../types';
import { ACADEMIC_FEE_TYPES, PAYMENT_METHODS, academicFeeCategory, academicToday, getAcademicSemesterSummary } from '../../utils/academic';
import { formatCurrency } from '../../utils/formatters';
import { MAX_PAYMENT_RECEIPTS, RECEIPT_ACCEPT, receiptFileLabel, validateReceiptFile } from '../../services/academicReceipts';
import { AcademicDialog } from './AcademicDialog';

function PendingFile({ file, remove }: { file: File; remove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="academic-attached-file">
    <div className="academic-file-thumb">{url ? <img src={url} alt="Receipt preview" /> : <FileText size={21} />}</div>
    <div><strong>{file.name}</strong><span>{receiptFileLabel(file.size)} <span className="academic-file-new">New attachment</span></span></div>
    <button type="button" className="academic-icon-button" aria-label={`Remove ${file.name}`} onClick={remove}><X size={16} /></button>
  </div>;
}

export function AcademicPaymentModal({ payment, onClose }: { payment?: UniversityPayment; onClose: () => void }) {
  const { semesters, universityPayments, academicReceipts, academicSemesterId, saveAcademicPayment,
    setAcademicSemesterId, settings, showToast, academicUser } = useApp();
  const formId = useId();
  const [semesterId, setSemesterId] = useState(payment?.semesterId ??
    semesters.find((semester) => semester.id === academicSemesterId)?.id ?? semesters.find((semester) => semester.status === 'Active')?.id ?? semesters[0]?.id ?? '');
  const [feeType, setFeeType] = useState<AcademicFeeType>(payment ? academicFeeCategory(payment.feeType) : 'Registration Fee');
  const [title, setTitle] = useState(payment?.title ?? '');
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [date, setDate] = useState(payment?.date ?? academicToday());
  const [method, setMethod] = useState<PaymentMethod>(payment?.paymentMethod ?? 'bKash');
  const [reference, setReference] = useState(payment?.reference ?? '');
  const [note, setNote] = useState(payment?.note ?? '');
  const [retained, setRetained] = useState<AcademicReceipt[]>(() => academicReceipts.filter((receipt) => receipt.paymentId === payment?.id));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const selected = semesters.find((semester) => semester.id === semesterId);
  const semesterSummary = selected ? getAcademicSemesterSummary(selected, universityPayments) : null;

  const addFiles = async (incoming: File[]) => {
    setChecking(true); setError('');
    try {
      if (files.length + retained.length + incoming.length > MAX_PAYMENT_RECEIPTS) throw new Error('You can attach up to five receipts to one payment.');
      for (const file of incoming) await validateReceiptFile(file);
      setFiles((previous) => [...previous, ...incoming]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read this receipt.'); }
    finally { setChecking(false); }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || checking) return;
    setBusy(true); setError('');
    try {
      const [year, month] = date.split('-').map(Number);
      await saveAcademicPayment({ id: payment?.id, semesterId, feeType, title: title.trim() || `${feeType} payment`,
        amount: Number(amount), date, year, month: month - 1, paymentMethod: method,
        reference: reference.trim() || undefined, note: note.trim() || undefined,
      }, files, retained.map((receipt) => receipt.id));
      setAcademicSemesterId(semesterId);
      showToast(payment ? 'Academic payment updated.' : 'Academic payment recorded.');
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Payment could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <AcademicDialog title={payment ? 'Edit academic payment' : 'Record a payment'} subtitle="University fees only. Your other balances stay separate." onClose={onClose} busy={busy}>
      <form className="academic-form" onSubmit={(event) => void submit(event)}>
        <div className="academic-form-grid">
          <label htmlFor={`${formId}-semester`}>Semester<select id={`${formId}-semester`} required value={semesterId} disabled={Boolean(payment && academicReceipts.some((receipt) => receipt.paymentId === payment.id))} onChange={(event) => setSemesterId(event.target.value)}>
            <option value="" disabled>Select a semester</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
          </select></label>
          <label htmlFor={`${formId}-fee`}>Fee category<select id={`${formId}-fee`} value={feeType} onChange={(event) => setFeeType(event.target.value as AcademicFeeType)}>{ACADEMIC_FEE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <div className="academic-form-grid">
          <label htmlFor={`${formId}-amount`}>Payment amount ({settings.currencySymbol})<input id={`${formId}-amount`} type="number" min="0.01" max="9999999999" step="0.01" inputMode="decimal" required autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
          <label htmlFor={`${formId}-date`}>Payment date<input id={`${formId}-date`} type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        {semesterSummary && <p className="academic-form-hint">Remaining payable for {selected?.name}: <strong>{formatCurrency(semesterSummary.remaining, settings.currencySymbol)}</strong></p>}
        <div className="academic-form-grid">
          <label htmlFor={`${formId}-method`}>Paid through<select id={`${formId}-method`} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label htmlFor={`${formId}-reference`}>Transaction ID <span>(optional)</span><input id={`${formId}-reference`} maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. TRX12345678" /></label>
        </div>
        <label htmlFor={`${formId}-description`}>Description <span>(optional)</span><input id={`${formId}-description`} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${feeType} payment`} /></label>
        <div className="academic-form-section-title"><span><Paperclip size={15} /> Payment receipts</span><span>{retained.length + files.length} / 5 attached</span></div>
        <label className={`academic-upload-zone${dragging ? ' dragging' : ''}`} htmlFor={`${formId}-receipts`}
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy && !checking) void addFiles(Array.from(event.dataTransfer.files)); }}>
          <span className="academic-upload-icon">{checking ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={22} />}</span>
          <strong>Drop your payment receipt here</strong>
          <span>or <b>browse files</b> from your device</span>
          <small>JPG, PNG, WebP or PDF. Up to 5 MB each.</small>
          <input id={`${formId}-receipts`} type="file" accept={RECEIPT_ACCEPT} multiple disabled={busy || checking} onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        </label>
        {(files.length > 0 || retained.length > 0) && <div className="academic-attached-files">
          {retained.map((receipt) => <div className="academic-attached-file" key={receipt.id}>
            <div className="academic-file-thumb">{receipt.mimeType === 'application/pdf' ? <FileText size={21} /> : <FileImage size={21} />}</div>
            <div><strong>{receipt.originalName}</strong><span><Check size={12} /> Already saved</span></div>
            <button type="button" className="academic-icon-button" aria-label={`Remove ${receipt.originalName}`} disabled={busy} onClick={() => setRetained((previous) => previous.filter((item) => item.id !== receipt.id))}><X size={16} /></button>
          </div>)}
          {files.map((file, index) => <PendingFile key={`${file.name}-${index}`} file={file} remove={() => setFiles((previous) => previous.filter((_, at) => at !== index))} />)}
        </div>}
        <label htmlFor={`${formId}-note`}>Note <span>(optional)</span><textarea id={`${formId}-note`} rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything you want to remember about this payment." /></label>
        <p className="academic-storage-hint"><ShieldCheck size={15} />{academicUser ? 'Receipts are stored in your private Supabase bucket.' : 'Receipts are saved on this device. Connect cloud for a backup.'}</p>
        {error && <p className="academic-error" role="alert">{error}</p>}
        <div className="academic-form-actions"><button className="academic-button secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="academic-button primary" type="submit" disabled={busy || checking || !semesters.length}>{busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Saving payment...' : payment ? 'Save changes' : 'Save payment'}</button></div>
      </form>
    </AcademicDialog>
  );
}