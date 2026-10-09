import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, BookOpen, Bus, Check, CheckCircle2, ChevronRight,
  Cloud, FileImage, FileText, GraduationCap, HardDrive, Layers, Loader2, LockKeyhole,
  Paperclip, Pencil, Plus, ReceiptText, Search, ShieldCheck, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AcademicReceipt, Semester, UniversityPayment } from '../../types';
import { academicFeeCategory, getAcademicSemesterSummary } from '../../utils/academic';
import { formatCurrency, formatDateLabel } from '../../utils/formatters';
import { AcademicSemesterModal } from './AcademicSemesterModal';
import { AcademicPaymentModal } from './AcademicPaymentModal';
import { AcademicCloudModal } from './AcademicCloudModal';
import { AcademicDialog } from './AcademicDialog';
import { ReceiptViewer } from './ReceiptViewer';
import './academic.css';

const feeIcons = { 'Registration Fee': BookOpen, 'Final Exam Fee': FileText, 'Transport Fee': Bus, 'Other Fee': Layers };

function ReceiptThumbnail({ receipt, onClick }: { receipt: AcademicReceipt; onClick: () => void }) {
  const { readAcademicReceipt } = useApp();
  const read = useRef(readAcademicReceipt);
  read.current = readAcademicReceipt;
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!receipt.mimeType.startsWith('image/')) return;
    let alive = true;
    let objectUrl = '';
    void read.current(receipt).then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => undefined);
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [receipt.id]);
  return <button type="button" className="academic-vault-item" onClick={onClick} aria-label={`View receipt ${receipt.originalName}`}>
    <div className="academic-vault-preview">{url ? <img src={url} alt="" loading="lazy" /> : receipt.mimeType === 'application/pdf' ? <FileText size={30} /> : <FileImage size={30} />}<span><Search size={14} />View</span></div>
    <strong title={receipt.originalName}>{receipt.originalName}</strong><small>{formatDateLabel(receipt.createdAt.slice(0, 10))} <ChevronRight size={13} /></small>
  </button>;
}

function ReceiptIllustration() {
  return <svg className="academic-receipt-illustration" viewBox="0 0 200 180" fill="none" aria-hidden="true">
    <circle cx="100" cy="90" r="72" fill="#f3efeb" />
    <g transform="rotate(-12 100 90)"><rect x="62" y="27" width="80" height="119" rx="7" fill="#e5ddd9" /></g>
    <path d="M62 27h76a5 5 0 0 1 5 5v120l-9-5-9 5-9-5-9 5-9-5-9 5-9-5-9 5-9-5V32a5 5 0 0 1 5-5Z" fill="white" stroke="#d8cdc7" />
    <rect x="80" y="45" width="44" height="7" rx="3" fill="#8c7c91" />
    <path d="M78 65h48M78 75h38M78 93h23m13 0h12M78 104h23m13 0h12M78 120h48" stroke="#d8cdc7" strokeWidth="3" strokeLinecap="round" />
    <circle cx="142" cy="132" r="21" fill="#e4eeec" stroke="white" strokeWidth="4" />
    <path d="m134 132 5 5 10-11" stroke="#486a66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export const UniversityView = () => {
  const {
    semesters, universityPayments, academicReceipts, settings, setActiveTab,
    academicSemesterId, setAcademicSemesterId, deleteUniversityPayment, deleteAcademicSemester,
    academicUser, academicLoading, academicError, reloadAcademic, showToast,
  } = useApp();
  const [semesterEditor, setSemesterEditor] = useState<Semester | 'new' | null>(null);
  const [paymentEditor, setPaymentEditor] = useState<UniversityPayment | 'new' | null>(null);
  const [viewReceipt, setViewReceipt] = useState<AcademicReceipt | null>(null);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [receiptFilter, setReceiptFilter] = useState('all');
  const [latestFirst, setLatestFirst] = useState(true);
  const [vaultLimit, setVaultLimit] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'payment' | 'semester'; id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const selected = semesters.find((semester) => semester.id === academicSemesterId) ?? semesters.find((semester) => semester.status === 'Active') ?? semesters[semesters.length - 1];
  const summary = useMemo(() => selected ? getAcademicSemesterSummary(selected, universityPayments, academicReceipts) : null, [selected, universityPayments, academicReceipts]);
  const format = (amount: number) => formatCurrency(amount, settings.currencySymbol);
  const displayName = (name: string) => name.replace(/^\d+(?:st|nd|rd|th) Semester \((.+)\)$/, '$1');
  const paymentReceipts = useMemo(() => {
    const groups = new Map<string, AcademicReceipt[]>();
    for (const receipt of academicReceipts) groups.set(receipt.paymentId, [...(groups.get(receipt.paymentId) ?? []), receipt]);
    return groups;
  }, [academicReceipts]);
  const filteredPayments = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = (summary?.payments ?? []).filter((payment) => {
      const hasReceipt = Boolean(paymentReceipts.get(payment.id)?.length);
      return (receiptFilter === 'all' || (receiptFilter === 'attached' ? hasReceipt : !hasReceipt)) &&
        `${payment.title} ${payment.feeType} ${payment.reference ?? ''} ${payment.date}`.toLowerCase().includes(search);
    });
    return latestFirst ? filtered : [...filtered].reverse();
  }, [summary, query, receiptFilter, latestFirst, paymentReceipts]);

  const chooseSemester = (id: string) => { setAcademicSemesterId(id); setQuery(''); setReceiptFilter('all'); setVaultLimit(6); };
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      if (deleteTarget.type === 'payment') await deleteUniversityPayment(deleteTarget.id);
      else { await deleteAcademicSemester(deleteTarget.id); setAcademicSemesterId(null); }
      showToast(deleteTarget.type === 'payment' ? 'Academic payment deleted.' : 'Empty semester deleted.');
      setDeleteTarget(null);
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Could not delete this record.'); }
    finally { setDeleting(false); }
  };
  const ready = !academicLoading && !academicError;

  return (
    <div className="academic-portal">
      <div className="academic-breadcrumb"><div><button type="button" onClick={() => setActiveTab('dashboard')}>Home</button><ChevronRight size={13} /><span>University</span></div>
        <button className="academic-cloud-link" type="button" onClick={() => setCloudOpen(true)}>{academicUser ? <Cloud size={15} /> : <HardDrive size={15} />}{academicUser ? 'Private cloud' : 'Saved on this device'}<ChevronRight size={13} /></button>
      </div>
      <header className="academic-page-header">
        <div><div className="academic-eyebrow"><GraduationCap size={17} />YOUR ACADEMIC LEDGER</div><h1>Academic Portal<span>.</span></h1><p>Every semester. Every payment. Everything accounted for.</p></div>
        <div className="academic-page-actions"><button type="button" className="academic-button secondary" disabled={!ready} onClick={() => setSemesterEditor('new')}><Plus size={16} />Add semester</button>
          <button type="button" className="academic-button primary" disabled={!selected || !ready} onClick={() => setPaymentEditor('new')}><Plus size={16} />Record payment</button></div>
      </header>

      {academicError && <div className="academic-error academic-load-error" role="alert"><span>{academicError}</span><button className="academic-button secondary" type="button" onClick={reloadAcademic}>Retry</button></div>}
      {academicLoading ? <div className="academic-loading"><Loader2 size={28} className="animate-spin" /><p>Loading your private academic records...</p></div>
        : !selected || !summary ? <div className="academic-empty-semesters"><GraduationCap size={42} /><h2>Your next semester starts here</h2><p>Add a semester, set the fees, and keep every payment receipt in one place.</p><button type="button" className="academic-button primary" disabled={!ready} onClick={() => setSemesterEditor('new')}><Plus size={16} />Add your first semester</button>{academicUser && <button className="academic-text-button" type="button" onClick={() => setCloudOpen(true)}>Back up existing device records instead <ArrowRight size={14} /></button>}</div>
          : <>
            <section className="academic-semesters-section" aria-labelledby="academic-semesters-title">
              <div className="academic-semesters-heading">
                <div><h2 id="academic-semesters-title">Your semesters <span>{semesters.length}</span></h2><p>Select a card to open its fee details, payments and receipts.</p></div>
              </div>
              <div className="academic-semester-cards">
                {semesters.map((semester) => {
                  const semesterSummary = getAcademicSemesterSummary(semester, universityPayments, academicReceipts);
                  const active = selected.id === semester.id;
                  const complete = semesterSummary.required > 0 && semesterSummary.remaining === 0;
                  return <button key={semester.id} type="button" aria-pressed={active} aria-controls="academic-semester-panel"
                    onClick={() => chooseSemester(semester.id)} className={`academic-semester-card${active ? ' active' : ''}`}>
                    <span className="academic-semester-card-status">{complete ? <CheckCircle2 size={14} /> : <span className={semester.status === 'Active' ? 'active-dot' : 'upcoming-dot'} />}{complete ? 'Settled' : semester.status}</span>
                    <strong>{displayName(semester.name)}</strong>
                    <span className="academic-semester-card-code">{semester.name}</span>
                    <span className="academic-semester-card-metrics"><span>Required <b>{format(semesterSummary.required)}</b></span><span>Paid <b>{format(semesterSummary.paid)}</b></span></span>
                    <span className="academic-semester-card-progress"><i style={{ width: `${semesterSummary.progress}%` }} /></span>
                    <span className="academic-semester-card-footer"><span>Due <b>{format(semesterSummary.remaining)}</b></span><span className="academic-semester-open">{active ? 'Viewing' : 'View details'} <ChevronRight size={13} /></span></span>
                  </button>;
                })}
              </div>
            </section>

            <div id="academic-semester-panel" aria-label={selected.name} key={selected.id} className="academic-semester-content">
              <div className="academic-top-grid">
                <section className="academic-balance-card" aria-labelledby="academic-balance-title">
                  <div className="academic-balance-header"><span><GraduationCap size={18} />{displayName(selected.name)}</span><span className="academic-payment-status"><span />{summary.required === 0 ? 'Fees not set' : summary.remaining === 0 ? 'Fully paid' : summary.paid > 0 ? 'In progress' : 'Awaiting payment'}</span></div>
                  <div className="academic-balance-main"><p id="academic-balance-title">REMAINING PAYABLE</p><strong>{format(summary.remaining)}</strong><span>Keep your next payment in sight.</span></div>
                  <div className="academic-balance-metrics"><div><span><CheckCircle2 size={13} />Total Paid</span><strong>{format(summary.paid)}</strong></div><div><span>Due</span><strong>{format(summary.remaining)}</strong></div></div>
                  <div className="academic-settlement"><div><span>{Math.round(summary.progress)}% settled</span><span>{summary.payments.length} {summary.payments.length === 1 ? 'payment' : 'payments'}</span></div><progress max="100" value={summary.progress} aria-label="Semester fees paid" /></div>
                  {summary.credit > 0 && <p className="academic-credit">Credit balance: {format(summary.credit)}</p>}
                  <div className="academic-balance-footer"><ShieldCheck size={14} /><span>Separate from your monthly and extra wallets</span></div>
                </section>

                <section className="academic-fees-panel" aria-labelledby="academic-fees-title">
                  <div className="academic-section-heading"><div><h2 id="academic-fees-title">Required fees</h2><p>A semester, broken down simply.</p></div><div className="academic-semester-card-actions"><button type="button" className="academic-icon-button" aria-label="Edit semester fees" onClick={() => setSemesterEditor(selected)}><Pencil size={17} /></button><button type="button" className="academic-icon-button danger" aria-label={`Delete ${selected.name} semester`} onClick={() => { setDeleteError(''); setDeleteTarget({ type: 'semester', id: selected.id, title: selected.name }); }}><Trash2 size={17} /></button></div></div>
                  <div className="academic-fee-table-header"><span>FEE CATEGORY</span><span>REQUIRED</span><span>PAID</span></div>
                  <div className="academic-fee-breakdown">
                    {summary.feeBreakdown.filter((fee) => fee.category !== 'Other Fee' || fee.amount > 0 || fee.paid > 0).map((fee) => {
                      const Icon = feeIcons[fee.category];
                      const settled = fee.amount > 0 && fee.paid >= fee.amount;
                      return <div className="academic-fee-row" key={fee.id}>
                        <div className={`academic-fee-identity ${fee.category === 'Transport Fee' ? 'teal' : ''}`}><span className="academic-fee-icon"><Icon size={18} /></span><div><strong>{fee.category}</strong><small>{fee.dueDate ? `Due ${formatDateLabel(fee.dueDate)}` : settled ? 'Payment complete' : fee.amount === 0 ? 'Not required' : `${format(fee.remaining)} still payable`}</small></div></div>
                        <span className="academic-fee-amount">{format(fee.amount)}</span><span className={`academic-fee-paid${settled ? ' settled' : ''}`}>{settled && <Check size={13} />}{format(fee.paid)}</span>
                      </div>;
                    })}
                  </div>
                  {summary.needsFeeSetup && <p className="academic-legacy-note">Your original fee total is preserved. <button type="button" onClick={() => setSemesterEditor(selected)}>Set up the breakdown <ArrowRight size={12} /></button></p>}
                </section>
              </div>

              <div className="academic-bottom-grid">
                <section className="academic-payments-panel" aria-labelledby="academic-history-title">
                  <div className="academic-section-heading"><div><h2 id="academic-history-title">Payment history <span className="academic-inline-count">{summary.payments.length}</span></h2><p>Your payments, with proof to match.</p></div><button type="button" className="academic-icon-button" aria-label={latestFirst ? 'Sort oldest payments first' : 'Sort newest payments first'} onClick={() => setLatestFirst((value) => !value)}><ArrowDownUp size={17} /></button></div>
                  <div className="academic-payment-toolbar"><label className="academic-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payments..." aria-label="Search academic payments" /></label><select aria-label="Filter payments by receipt" value={receiptFilter} onChange={(event) => setReceiptFilter(event.target.value)}><option value="all">All receipts</option><option value="attached">With receipt</option><option value="missing">No receipt</option></select></div>
                  {!filteredPayments.length ? <div className="academic-payment-empty"><ReceiptText size={29} /><h3>{summary.payments.length ? 'No matching payments' : 'No payments recorded yet'}</h3><p>{summary.payments.length ? 'Try another search or receipt filter.' : 'Record a payment to start this semester\'s history.'}</p>{!summary.payments.length && <button type="button" className="academic-text-button" onClick={() => setPaymentEditor('new')}>Record your first payment <ArrowRight size={14} /></button>}</div>
                    : <div className="academic-payment-table-wrap"><table className="academic-payment-table"><caption className="sr-only">Payments for {selected.name}</caption><thead><tr><th>PAYMENT</th><th>PAID VIA</th><th>AMOUNT</th><th>RECEIPT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                      {filteredPayments.slice(0, 100).map((payment) => {
                        const attached = paymentReceipts.get(payment.id) ?? [];
                        const method = payment.paymentMethod || 'Other';
                        return <tr key={payment.id}><td><div className="academic-payment-name"><span className="academic-history-icon"><ReceiptText size={16} /></span><div><strong title={payment.title}>{payment.title}</strong><small>{formatDateLabel(payment.date)} <span>/</span> {academicFeeCategory(payment.feeType)}</small>{payment.reference && <small className="academic-reference">ID: {payment.reference}</small>}</div></div></td>
                          <td><span className={`academic-method method-${method.toLowerCase()}`}><span>{method === 'bKash' ? 'b' : method === 'CellFin' ? 'C' : method === 'Bank' ? 'B' : method === 'Cash' ? 'C' : 'P'}</span>{method}</span></td>
                          <td className="academic-history-amount">{format(payment.amount)}</td>
                          <td>{attached.length ? <button type="button" className="academic-receipt-link" onClick={() => setViewReceipt(attached[0])}><Paperclip size={14} />{attached.length} {attached.length === 1 ? 'file' : 'files'}</button> : <button type="button" className="academic-receipt-link missing" onClick={() => setPaymentEditor(payment)}><Plus size={13} />Attach</button>}</td>
                          <td><div className="academic-row-actions"><button type="button" className="academic-icon-button" aria-label={`Edit ${payment.title}`} onClick={() => setPaymentEditor(payment)}><Pencil size={15} /></button><button type="button" className="academic-icon-button danger" aria-label={`Delete ${payment.title}`} onClick={() => { setDeleteError(''); setDeleteTarget({ type: 'payment', id: payment.id, title: payment.title }); }}><Trash2 size={15} /></button></div></td>
                        </tr>;
                      })}
                    </tbody></table></div>}
                  <div className="academic-history-footer"><span>{filteredPayments.length > 100 ? `Showing 100 of ${filteredPayments.length}. Use search to find older payments.` : `${filteredPayments.length} ${filteredPayments.length === 1 ? 'record' : 'records'} for ${displayName(selected.name)}`}</span><span><LockKeyhole size={12} />Only visible to you</span></div>
                </section>

                <aside className="academic-vault" aria-labelledby="academic-vault-title">
                  <div className="academic-section-heading"><div><h2 id="academic-vault-title">Receipt vault</h2><p>{summary.receipts.length ? `${summary.receipts.length} ${summary.receipts.length === 1 ? 'receipt' : 'receipts'} saved for this semester` : 'Your proof of payment, kept safe.'}</p></div><span className="academic-vault-lock"><LockKeyhole size={17} /></span></div>
                  {summary.receipts.length ? <><div className="academic-vault-grid">{summary.receipts.slice(0, vaultLimit).map((receipt) => <ReceiptThumbnail key={receipt.id} receipt={receipt} onClick={() => setViewReceipt(receipt)} />)}</div>{summary.receipts.length > vaultLimit && <button type="button" className="academic-text-button" onClick={() => setVaultLimit((value) => value + 6)}>Show more receipts <ArrowRight size={14} /></button>}</>
                    : <div className="academic-vault-empty"><ReceiptIllustration /><h3>A little proof. A lot of peace.</h3><p>Add a bKash, CellFin or bank receipt to any payment.</p><button type="button" className="academic-button secondary" onClick={() => setPaymentEditor(summary.payments[0] ?? 'new')}><Paperclip size={15} />Attach a receipt</button></div>}
                  <p className="academic-vault-footer"><ShieldCheck size={14} />{academicUser ? 'Private, authenticated cloud storage' : 'Saved on this device'}</p>
                </aside>
              </div>
            </div>
          </>}
      <footer className="academic-page-footer"><span>Academic fees only. Not income. Not everyday expenses.</span><span><ShieldCheck size={13} />Your other wallets stay untouched.</span></footer>

      {semesterEditor && <AcademicSemesterModal semester={semesterEditor === 'new' ? undefined : semesterEditor} onClose={() => setSemesterEditor(null)} onSaved={(semester) => chooseSemester(semester.id)} />}
      {paymentEditor && <AcademicPaymentModal payment={paymentEditor === 'new' ? undefined : paymentEditor} onClose={() => setPaymentEditor(null)} />}
      {viewReceipt && <ReceiptViewer receipt={viewReceipt} onClose={() => setViewReceipt(null)} />}
      {cloudOpen && <AcademicCloudModal onClose={() => setCloudOpen(false)} />}
      {deleteTarget && (() => {
        const targetPayments = deleteTarget.type === 'semester' ? universityPayments.filter((payment) => payment.semesterId === deleteTarget.id) : [];
        const targetReceipts = deleteTarget.type === 'semester' ? academicReceipts.filter((receipt) => targetPayments.some((payment) => payment.id === receipt.paymentId)) : [];
        return <AcademicDialog title={deleteTarget.type === 'payment' ? 'Delete this payment?' : 'Remove this semester?'} subtitle={deleteTarget.title} onClose={() => setDeleteTarget(null)} busy={deleting}><div className="academic-form"><p className="academic-confirm-text">{deleteTarget.type === 'payment' ? 'The payment and its attached receipts will be permanently removed. Your monthly and extra wallets will not change.' : targetPayments.length ? `This semester, its fee setup, ${targetPayments.length} payment${targetPayments.length === 1 ? '' : 's'} and ${targetReceipts.length} receipt${targetReceipts.length === 1 ? '' : 's'} will be permanently removed. Your monthly and extra wallets will not change.` : 'Only this semester and its fee setup will be removed.'}</p>{deleteError && <p className="academic-error" role="alert">{deleteError}</p>}<div className="academic-form-actions"><button type="button" className="academic-button secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="academic-button destructive" disabled={deleting} onClick={() => void confirmDelete()}>{deleting && <Loader2 size={16} className="animate-spin" />}Delete {deleteTarget.type}</button></div></div></AcademicDialog>;
      })()}
    </div>
  );
};