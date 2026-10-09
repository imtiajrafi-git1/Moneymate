import type {
  AcademicSnapshot, AcademicReceipt, Semester, UniversityPayment,
  SemesterFee, AcademicFeeType, PaymentMethod,
} from '../types';
import { academicFeeCategory, getSemesterFees, normalizeAcademicSnapshot } from '../utils/academic';
import { supabase } from '../lib/supabase';

export const academicSupabase = supabase;
export const academicCloudConfigured = Boolean(academicSupabase);
export const ACADEMIC_RECEIPT_BUCKET = 'academic-receipts';

async function requireUser(expectedUserId: string) {
  if (!academicSupabase) throw new Error('Supabase is not configured.');
  const { data, error } = await academicSupabase.auth.getUser();
  if (error || data.user?.id !== expectedUserId) throw new Error('Your cloud session has changed. Please sign in again.');
  return academicSupabase;
}

interface SemesterRow { id: string; name: string; status: Semester['status']; updated_at: string }
interface FeeRow { id: string; semester_id: string; category: AcademicFeeType; amount: number; due_date: string | null }
interface PaymentRow {
  id: string; semester_id: string; title: string; amount: number; fee_type: AcademicFeeType;
  paid_on: string; payment_method: PaymentMethod; reference: string | null; note: string | null;
}
interface ReceiptRow {
  id: string; semester_id: string; payment_id: string; original_name: string;
  mime_type: AcademicReceipt['mimeType']; size_bytes: number; storage_path: string; created_at: string;
}

async function readAll<T>(table: string, userId: string): Promise<T[]> {
  const client = await requireUser(userId);
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from(table).select('*').eq('user_id', userId).order('created_at').order('id').range(start, start + 499);
    if (error) throw new Error(`Could not load academic records. ${error.message}`);
    rows.push(...(data as unknown as T[]));
    if (data.length < 500) break;
  }
  return rows;
}

export async function loadAcademicCloud(userId: string): Promise<AcademicSnapshot> {
  const [semesters, fees, payments, receipts] = await Promise.all([
    readAll<SemesterRow>('academic_semesters', userId),
    readAll<FeeRow>('academic_semester_fees', userId),
    readAll<PaymentRow>('academic_payments', userId),
    readAll<ReceiptRow>('academic_receipts', userId),
  ]);
  return normalizeAcademicSnapshot({
    semesters: semesters.map((semester) => {
      const ownFees: SemesterFee[] = fees.filter((fee) => fee.semester_id === semester.id).map((fee) => ({
        id: fee.id, category: fee.category, amount: Number(fee.amount), dueDate: fee.due_date ?? undefined,
      }));
      return { id: semester.id, name: semester.name, status: semester.status, fees: ownFees,
        totalFee: ownFees.reduce((sum, fee) => sum + fee.amount, 0), updatedAt: semester.updated_at };
    }),
    payments: payments.map((payment) => {
      const [year, month] = payment.paid_on.split('-').map(Number);
      return { id: payment.id, title: payment.title, semesterId: payment.semester_id, amount: Number(payment.amount),
        feeType: payment.fee_type, date: payment.paid_on, month: month - 1, year,
        paymentMethod: payment.payment_method, reference: payment.reference ?? undefined, note: payment.note ?? undefined };
    }),
    receipts: receipts.map((receipt) => ({
      id: receipt.id, semesterId: receipt.semester_id, paymentId: receipt.payment_id,
      originalName: receipt.original_name, mimeType: receipt.mime_type, size: receipt.size_bytes,
      storage: 'supabase', path: receipt.storage_path, createdAt: receipt.created_at,
    })),
  });
}

export async function saveCloudSemester(userId: string, semester: Semester): Promise<void> {
  const client = await requireUser(userId);
  const { error } = await client.rpc('academic_save_semester', {
    p_id: semester.id, p_name: semester.name, p_status: semester.status,
    p_fees: getSemesterFees(semester).map((fee) => ({ id: fee.id, category: fee.category, amount: fee.amount, due_date: fee.dueDate || null })),
  });
  if (error) throw new Error(`Could not save the semester. ${error.message}`);
}

export async function uploadCloudReceipt(userId: string, receipt: AcademicReceipt, file: Blob): Promise<void> {
  const client = await requireUser(userId);
  const { error } = await client.storage.from(ACADEMIC_RECEIPT_BUCKET).upload(receipt.path, file, {
    contentType: receipt.mimeType, cacheControl: '60', upsert: false,
  });
  if (error) throw new Error(`Receipt upload failed. ${error.message}`);
}

export async function saveCloudPayment(userId: string, payment: UniversityPayment, receipts: AcademicReceipt[]): Promise<void> {
  const client = await requireUser(userId);
  const { error } = await client.rpc('academic_save_payment', {
    p_payment: {
      id: payment.id, semester_id: payment.semesterId, title: payment.title, amount: payment.amount,
      fee_type: academicFeeCategory(payment.feeType), paid_on: payment.date,
      payment_method: payment.paymentMethod || 'Other', reference: payment.reference || null, note: payment.note || null,
    },
    p_receipts: receipts.map((receipt) => ({ id: receipt.id, original_name: receipt.originalName,
      mime_type: receipt.mimeType, size_bytes: receipt.size, storage_path: receipt.path })),
  });
  if (error) throw new Error(`Could not save the payment. ${error.message}`);
}

export async function deleteCloudRecord(userId: string, table: 'academic_payments' | 'academic_semesters', id: string): Promise<void> {
  const client = await requireUser(userId);
  if (table === 'academic_semesters') {
    const { error } = await client.rpc('academic_delete_empty_semester', { p_id: id });
    if (error) throw new Error(`Could not remove the semester. ${error.message}`);
    return;
  }
  const { data, error } = await client.from(table).delete().eq('user_id', userId).eq('id', id).select('id');
  if (error) throw new Error(`Could not delete the record. ${error.message}`);
  if (!data?.length) throw new Error('This record was not found or you no longer have access.');
}

export async function removeCloudFiles(userId: string, receipts: AcademicReceipt[]): Promise<void> {
  if (!receipts.length) return;
  const client = await requireUser(userId);
  const { error } = await client.storage.from(ACADEMIC_RECEIPT_BUCKET).remove(receipts.map((receipt) => receipt.path));
  if (error) throw new Error('The record was saved, but an old receipt file could not be removed from cloud storage.');
}

export async function downloadCloudReceipt(userId: string, receipt: AcademicReceipt): Promise<Blob> {
  const client = await requireUser(userId);
  // Authenticated download avoids a publicly shareable or persisted signed URL.
  const { data, error } = await client.storage.from(ACADEMIC_RECEIPT_BUCKET).download(receipt.path);
  if (error) throw new Error(`Could not open the private receipt. ${error.message}`);
  return data;
}