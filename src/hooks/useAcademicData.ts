import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AcademicSnapshot, AcademicReceipt, AcademicSemesterInput, AcademicPaymentInput, Semester, UniversityPayment } from '../types';
import { Storage } from '../utils/storage';
import { academicFeeCategory, getSemesterFees, isAcademicDate, money, newAcademicId, normalizeAcademicSnapshot, validateAcademicPayment } from '../utils/academic';
import { deviceReceipts, MAX_PAYMENT_RECEIPTS, validateReceiptFile } from '../services/academicReceipts';
import {
  academicCloudConfigured, academicSupabase, loadAcademicCloud, saveCloudSemester, saveCloudPayment,
  uploadCloudReceipt, removeCloudFiles, deleteCloudRecord, downloadCloudReceipt,
} from '../services/academicCloud';

export const loadLocalAcademic = () => normalizeAcademicSnapshot({
  semesters: Storage.getSemesters(), payments: Storage.getUniversityPayments(), receipts: Storage.getAcademicReceipts(),
});

export function useAcademicData(isLocked: boolean) {
  const [data, setData] = useState<AcademicSnapshot>(loadLocalAcademic);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  const dataOwnerRef = useRef(dataOwner);
  const [revision, setRevision] = useState(0);
  const current = useRef(data);
  const owner = useRef<string | null>(null);
  const busy = useRef(false);
  const locked = useRef(isLocked);
  locked.current = isLocked;
  current.current = data;

  useEffect(() => {
    if (!academicSupabase) return;
    let alive = true;
    void academicSupabase.auth.getSession().then(({ data: sessionData }) => {
      if (alive) { owner.current = sessionData.session?.user.id ?? null; setUser(sessionData.session?.user ?? null); }
    }).catch(() => { if (alive) setError('Could not restore the cloud session.'); });
    const { data: listener } = academicSupabase.auth.onAuthStateChange((_event, session) => {
      if (alive) { owner.current = session?.user.id ?? null; setUser(session?.user ?? null); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isLocked) return;
    let alive = true;
    setError('');
    if (!user) {
      setData(loadLocalAcademic());
      dataOwnerRef.current = null;
      setDataOwner(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Device records are never silently uploaded into a newly signed-in account.
    if (dataOwnerRef.current !== user.id) setData({ semesters: [], payments: [], receipts: [] });
    void loadAcademicCloud(user.id).then((snapshot) => {
      if (alive) {
        setData(snapshot);
        dataOwnerRef.current = user.id;
        setDataOwner(user.id);
      }
    })
      .catch((cause: unknown) => { if (alive) setError(cause instanceof Error ? cause.message : 'Could not load cloud records.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.id, isLocked, revision]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (!document.hidden && !locked.current && !busy.current) setRevision((value) => value + 1);
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, []);

  const operation = useCallback(async <T,>(task: (ownerId: string | null) => Promise<T>): Promise<T> => {
    if (locked.current) throw new Error('Unlock the app before changing academic records.');
    if (loading || (user && (error || dataOwner !== user.id))) throw new Error('Cloud records are not ready. Retry loading before saving.');
    if (busy.current) throw new Error('A save is in progress. Please wait.');
    busy.current = true;
    try { return await task(owner.current); } finally { busy.current = false; }
  }, [loading, user, error, dataOwner]);

  const commit = (snapshot: AcademicSnapshot, ownerId: string | null) => {
    if (owner.current !== ownerId) throw new Error('Your session changed. Reload the academic portal.');
    if (!ownerId) Storage.saveAcademicSnapshot(snapshot);
    current.current = snapshot;
    setData(snapshot);
    dataOwnerRef.current = ownerId;
    setDataOwner(ownerId);
  };

  const saveSemester = (input: AcademicSemesterInput) => operation(async (ownerId) => {
    if (!input.name.trim() || input.name.length > 120) throw new Error('Enter a semester name under 120 characters.');
    const semester: Semester = { ...input, id: input.id ?? newAcademicId(), name: input.name.trim(), updatedAt: new Date().toISOString() };
    const sourceFees = getSemesterFees(semester);
    if (sourceFees.some((fee) => !Number.isFinite(fee.amount) || fee.amount < 0 || (fee.dueDate && !isAcademicDate(fee.dueDate)))) throw new Error('Enter valid non-negative fees and due dates.');
    semester.fees = sourceFees.map((fee) => ({ ...fee, amount: money(fee.amount) }));
    semester.totalFee = money(semester.fees.reduce((sum, fee) => sum + fee.amount, 0));
    if (ownerId) await saveCloudSemester(ownerId, semester);
    const snapshot = current.current;
    commit({ ...snapshot, semesters: snapshot.semesters.some((item) => item.id === semester.id)
      ? snapshot.semesters.map((item) => item.id === semester.id ? semester : item) : [...snapshot.semesters, semester] }, ownerId);
    return semester;
  });

  const savePayment = (input: AcademicPaymentInput, files: File[] = [], retainIds?: string[]) => operation(async (ownerId) => {
    const snapshot = current.current;
    validateAcademicPayment(input, snapshot.semesters);
    const id = input.id ?? newAcademicId();
    const oldReceipts = snapshot.receipts.filter((receipt) => receipt.paymentId === id);
    const retained = retainIds ? oldReceipts.filter((receipt) => retainIds.includes(receipt.id)) : oldReceipts;
    if (retained.length + files.length > MAX_PAYMENT_RECEIPTS) throw new Error('A payment can have up to five receipts.');
    const oldPayment = snapshot.payments.find((payment) => payment.id === id);
    if (oldPayment && oldPayment.semesterId !== input.semesterId && oldReceipts.length) throw new Error('A payment with saved receipts must stay in its original semester.');
    const [year, month] = input.date.split('-').map(Number);
    const payment: UniversityPayment = { ...input, id, amount: money(input.amount), title: input.title.trim(),
      feeType: academicFeeCategory(input.feeType), year, month: month - 1 };
    const additions: { receipt: AcademicReceipt; file: File }[] = [];
    for (const file of files) {
      const mimeType = await validateReceiptFile(file);
      const receiptId = newAcademicId();
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[mimeType];
      additions.push({ file, receipt: {
        id: receiptId, paymentId: id, semesterId: payment.semesterId, mimeType, size: file.size,
        originalName: file.name.replace(/[\x00-\x1f]/g, '').slice(0, 160) || `receipt.${extension}`,
        storage: ownerId ? 'supabase' : 'device',
        path: ownerId ? `${ownerId}/${payment.semesterId}/${id}/${receiptId}.${extension}` : receiptId,
        createdAt: new Date().toISOString(),
      } });
    }
    const uploaded: AcademicReceipt[] = [];
    try {
      if (ownerId) {
        for (const addition of additions) {
          await uploadCloudReceipt(ownerId, addition.receipt, addition.file);
          uploaded.push(addition.receipt);
        }
        await saveCloudPayment(ownerId, payment, [...retained, ...uploaded]);
      } else if (additions.length) {
        await deviceReceipts.putMany(additions.map((addition) => ({
          id: addition.receipt.id, blob: new Blob([addition.file], { type: addition.receipt.mimeType }),
        })));
      }
      commit({ ...snapshot,
        payments: snapshot.payments.some((item) => item.id === id)
          ? snapshot.payments.map((item) => item.id === id ? payment : item) : [payment, ...snapshot.payments],
        receipts: [...snapshot.receipts.filter((receipt) => receipt.paymentId !== id), ...retained, ...additions.map((addition) => addition.receipt)],
      }, ownerId);
    } catch (cause) {
      if (ownerId) await removeCloudFiles(ownerId, uploaded).catch(() => undefined);
      else if (additions.length) await deviceReceipts.removeMany(additions.map((addition) => addition.receipt.id)).catch(() => undefined);
      throw cause;
    }
    const removed = oldReceipts.filter((receipt) => !retained.some((item) => item.id === receipt.id));
    if (removed.length) {
      if (ownerId) await removeCloudFiles(ownerId, removed).catch(() => setError('Payment saved. An old receipt file needs cloud storage cleanup.'));
      else await deviceReceipts.removeMany(removed.map((receipt) => receipt.id)).catch(() => undefined);
    }
    return payment;
  });

  const deletePayment = (id: string) => operation(async (ownerId) => {
    const snapshot = current.current;
    if (ownerId) await deleteCloudRecord(ownerId, 'academic_payments', id);
    const removed = snapshot.receipts.filter((receipt) => receipt.paymentId === id);
    commit({ ...snapshot, payments: snapshot.payments.filter((payment) => payment.id !== id), receipts: snapshot.receipts.filter((receipt) => receipt.paymentId !== id) }, ownerId);
    if (ownerId) await removeCloudFiles(ownerId, removed).catch(() => setError('Record deleted. Some receipt files need cloud storage cleanup.'));
    else if (removed.length) await deviceReceipts.removeMany(removed.map((receipt) => receipt.id)).catch(() => undefined);
  });

  const deleteSemester = (id: string) => operation(async (ownerId) => {
    const snapshot = current.current;
    // Cascade delete: the semester's payments and their receipt files go with it.
    const semesterPayments = snapshot.payments.filter((payment) => payment.semesterId === id);
    const semesterPaymentIds = new Set(semesterPayments.map((payment) => payment.id));
    const removedFiles = snapshot.receipts.filter((receipt) => semesterPaymentIds.has(receipt.paymentId));
    // Cloud: payments must be gone before the empty-semester RPC will accept the semester.
    for (const payment of semesterPayments) {
      if (ownerId) await deleteCloudRecord(ownerId, 'academic_payments', payment.id);
    }
    if (removedFiles.length) {
      if (ownerId) {
        await removeCloudFiles(ownerId, removedFiles).catch(() => setError('Semester deleted. Some receipt files need cloud storage cleanup.'));
      } else {
        await deviceReceipts.removeMany(removedFiles.map((receipt) => receipt.id)).catch(() => undefined);
      }
    }
    if (ownerId) await deleteCloudRecord(ownerId, 'academic_semesters', id);
    commit({
      ...snapshot,
      semesters: snapshot.semesters.filter((semester) => semester.id !== id),
      payments: snapshot.payments.filter((payment) => !semesterPaymentIds.has(payment.id)),
      receipts: snapshot.receipts.filter((receipt) => !semesterPaymentIds.has(receipt.paymentId)),
    }, ownerId);
  });

  const readReceipt = async (receipt: AcademicReceipt): Promise<Blob> => {
    if (locked.current) throw new Error('Unlock the app to view receipts.');
    if (receipt.storage === 'device') return deviceReceipts.read(receipt.id);
    if (!owner.current) throw new Error('Sign in to view this private cloud receipt.');
    return downloadCloudReceipt(owner.current, receipt);
  };

  const importLocal = () => operation(async (ownerId) => {
    if (!ownerId) throw new Error('Sign in to back up device records.');
    const local = loadLocalAcademic();
    for (const semester of local.semesters) await saveCloudSemester(ownerId, semester);
    for (const payment of local.payments) {
      const existing = current.current.receipts.filter((receipt) => receipt.paymentId === payment.id);
      const additions: AcademicReceipt[] = [];
      try {
        for (const receipt of local.receipts.filter((item) => item.paymentId === payment.id)) {
          if (existing.some((item) => item.id === receipt.id)) continue;
          const file = await deviceReceipts.read(receipt.id);
          const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[receipt.mimeType];
          const remote: AcademicReceipt = { ...receipt, storage: 'supabase', path: `${ownerId}/${payment.semesterId}/${payment.id}/${receipt.id}.${extension}` };
          await uploadCloudReceipt(ownerId, remote, file);
          additions.push(remote);
        }
        await saveCloudPayment(ownerId, payment, [...existing, ...additions]);
      } catch (cause) {
        await removeCloudFiles(ownerId, additions).catch(() => undefined);
        setRevision((value) => value + 1);
        throw cause;
      }
    }
    setRevision((value) => value + 1);
  });

  const visibleData = dataOwner === (user?.id ?? null) ? data : { semesters: [], payments: [], receipts: [] };
  return {
    semesters: visibleData.semesters, universityPayments: visibleData.payments, academicReceipts: visibleData.receipts,
    saveAcademicSemester: saveSemester, saveAcademicPayment: savePayment,
    deleteAcademicSemester: deleteSemester, deleteUniversityPayment: deletePayment, readAcademicReceipt: readReceipt,
    academicUser: user, academicCloudConfigured,
    academicLoading: loading || Boolean(user && dataOwner !== user.id && !error), academicError: error,
    reloadAcademic: () => setRevision((value) => value + 1), importLocalAcademic: importLocal,
    resetLocalAcademic: () => { if (!owner.current) { const local = loadLocalAcademic(); current.current = local; setData(local); } },
  };
}