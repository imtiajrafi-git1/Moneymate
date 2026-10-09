import type {
  AcademicFeeType, AcademicPaymentInput, AcademicReceipt, AcademicSnapshot,
  FeeType, Semester, SemesterFee, UniversityPayment,
} from '../types';

export const ACADEMIC_FEE_TYPES: AcademicFeeType[] = ['Registration Fee', 'Final Exam Fee', 'Transport Fee', 'Other Fee'];
export const PAYMENT_METHODS = ['bKash', 'CellFin', 'Bank', 'Cash', 'Other'] as const;

export const newAcademicId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const money = (value: number) => Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : 0;
const sumMoney = (values: number[]) => values.reduce((sum, value) => sum + Math.round(money(value) * 100), 0) / 100;

export function academicToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isAcademicDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function academicFeeCategory(type: FeeType): AcademicFeeType {
  if (type === 'Exam Fee') return 'Final Exam Fee';
  if (type === 'Transport Cost') return 'Transport Fee';
  if (ACADEMIC_FEE_TYPES.includes(type as AcademicFeeType)) return type as AcademicFeeType;
  // A historic tuition/lab amount is not silently relabelled as registration.
  return 'Other Fee';
}

export function getSemesterFees(semester: Semester): SemesterFee[] {
  if (Array.isArray(semester.fees) && semester.fees.length) return semester.fees;
  return ACADEMIC_FEE_TYPES.map((category) => ({
    id: `${semester.id}-${category.toLowerCase().replace(/ /g, '-')}`,
    category,
    amount: category === 'Other Fee' ? money(semester.totalFee) : 0,
  }));
}

export function getAcademicPaidTotal(payments: UniversityPayment[], semesterId?: string): number {
  return sumMoney(payments.filter((payment) => !semesterId || payment.semesterId === semesterId).map((payment) => payment.amount));
}

export function getAcademicSemesterSummary(
  semester: Semester,
  payments: UniversityPayment[],
  receipts: AcademicReceipt[] = [],
) {
  const ownPayments = payments.filter((payment) => payment.semesterId === semester.id);
  const fees = getSemesterFees(semester);
  const required = sumMoney(fees.map((fee) => fee.amount));
  const paid = getAcademicPaidTotal(ownPayments);
  const ownReceipts = receipts.filter((receipt) => receipt.semesterId === semester.id);
  const feeBreakdown = fees.map((fee) => {
    const feePaid = sumMoney(ownPayments.filter((payment) => academicFeeCategory(payment.feeType) === fee.category).map((payment) => payment.amount));
    return { ...fee, paid: feePaid, remaining: Math.max(0, money(fee.amount - feePaid)) };
  });
  return {
    required, paid, remaining: Math.max(0, money(required - paid)),
    credit: Math.max(0, money(paid - required)),
    progress: required > 0 ? Math.min(100, paid / required * 100) : 0,
    payments: [...ownPayments].sort((a, b) => b.date.localeCompare(a.date)),
    receipts: ownReceipts, feeBreakdown,
    needsFeeSetup: !semester.fees?.length,
  };
}

export function normalizeAcademicSnapshot(snapshot: AcademicSnapshot): AcademicSnapshot {
  const paymentRecords = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  const payments = [...new Map(paymentRecords.filter((payment) => payment?.id).map((payment) => [payment.id, {
    ...payment, title: payment.title || 'Academic payment', date: payment.date || '',
  }])).values()];
  const semesters = Array.isArray(snapshot.semesters) ? [...snapshot.semesters] : [];
  // Preserve imported payments even when their semester record was missing.
  for (const payment of payments) {
    if (!semesters.some((semester) => semester.id === payment.semesterId)) {
      semesters.push({ id: payment.semesterId, name: 'Imported semester', status: 'Completed', totalFee: 0 });
    }
  }
  return { semesters, payments, receipts: Array.isArray(snapshot.receipts) ? snapshot.receipts : [] };
}

export function validateAcademicPayment(payment: AcademicPaymentInput, semesters: Semester[]): void {
  if (!payment.title.trim()) throw new Error('Please enter a payment description.');
  if (!Number.isFinite(payment.amount) || payment.amount <= 0 || payment.amount > 9999999999) throw new Error('Enter a valid payment amount greater than zero.');
  if (!isAcademicDate(payment.date)) throw new Error('Please choose a valid payment date.');
  if (!semesters.some((semester) => semester.id === payment.semesterId)) throw new Error('Choose an existing semester.');
  if (!ACADEMIC_FEE_TYPES.includes(academicFeeCategory(payment.feeType))) throw new Error('Choose a valid fee category.');
}