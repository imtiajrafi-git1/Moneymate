import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAcademicSemesterSummary, getSemesterFees, isAcademicDate, normalizeAcademicSnapshot } from '../src/utils/academic.ts';
import { getMonthlySummary, getUniversityTotal, getYearlySummary } from '../src/utils/finance.ts';
import { formatCurrency } from '../src/utils/formatters.ts';
import { MAX_RECEIPT_BYTES, validateReceiptFile } from '../src/services/academicReceipts.ts';
import type { AcademicReceipt, Income, Expense, Semester, UniversityPayment } from '../src/types/index.ts';

const semester: Semester = { id: 'spring-2025', name: 'Spring 2025', status: 'Active', totalFee: 53000, fees: [
  { id: 'registration', category: 'Registration Fee', amount: 30000 },
  { id: 'final', category: 'Final Exam Fee', amount: 20000 },
  { id: 'transport', category: 'Transport Fee', amount: 3000 },
] };
const payment = (id: string, amount: number, feeType: UniversityPayment['feeType'], semesterId = semester.id): UniversityPayment => ({
  id, title: `${feeType} payment`, amount, feeType, semesterId, date: '2025-02-01', month: 1, year: 2025, paymentMethod: 'bKash',
});

test('required fee = registration + final exam + transport; fees do not count as payments', () => {
  const summary = getAcademicSemesterSummary(semester, []);
  assert.equal(summary.required, 53000);
  assert.equal(summary.paid, 0);
  assert.equal(summary.remaining, 53000);
});

test('three partial payments settle their own semester only', () => {
  const payments = [payment('registration', 30000, 'Registration Fee'), payment('final', 20000, 'Final Exam Fee'),
    payment('transport', 3000, 'Transport Fee'), payment('different', 60000, 'Registration Fee', 'fall-2025')];
  const summary = getAcademicSemesterSummary(semester, payments);
  assert.equal(summary.paid, 53000);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.progress, 100);
  assert.deepEqual(summary.feeBreakdown.map((fee) => fee.paid), [30000, 20000, 3000]);
});

test('payment edit/delete recalculates from the ledger, not cached totals', () => {
  const original = [payment('one', 30000, 'Registration Fee'), payment('two', 10000, 'Final Exam Fee')];
  assert.equal(getAcademicSemesterSummary(semester, original).remaining, 13000);
  const edited = original.map((record) => record.id === 'two' ? { ...record, amount: 15000 } : record);
  assert.equal(getAcademicSemesterSummary(semester, edited).remaining, 8000);
  assert.equal(getAcademicSemesterSummary(semester, edited.filter((record) => record.id !== 'one')).remaining, 38000);
});

test('dashboard university total sums recorded payments across semesters', () => {
  const payments = [
    payment('spring-payment', 30000, 'Registration Fee'),
    payment('fall-payment', 25000, 'Registration Fee', 'fall-2025'),
  ];
  assert.equal(getUniversityTotal(payments), 55000);
  assert.equal(getUniversityTotal(payments.slice(1)), 25000);
});

test('university payments never change monthly income, expenses, or remaining balance', () => {
  const incomes: Income[] = [
    { id: 'pocket', type: 'monthly', title: 'Pocket money', category: 'Monthly Allowance', amount: 10000, date: '2025-02-01', month: 1, year: 2025 },
    { id: 'fund', type: 'semester', title: 'Legacy semester fund', category: 'Semester Fund', amount: 60000, date: '2025-02-01', month: 1, year: 2025 },
  ];
  const expenses: Expense[] = [{ id: 'food', title: 'Lunch', category: 'Food', amount: 1000, date: '2025-02-01', month: 1, year: 2025 }];
  const before = getMonthlySummary(incomes, expenses, [], 1, 2025);
  const after = getMonthlySummary(incomes, expenses, [payment('university', 53000, 'Registration Fee')], 1, 2025);
  assert.deepEqual(after, before);
  assert.equal(after.totalIncome, 10000);
  assert.equal(after.totalExpense, 1000);
  assert.equal(after.remaining, 9000);
  const yearly = getYearlySummary(incomes, expenses, [payment('large-fee', 53000, 'Registration Fee')], 2025);
  assert.equal(yearly.totalExpense, 1000);
  assert.equal(yearly.topSpendingCategory?.category, 'Food');
});

test('receipt metadata cannot increase paid amount', () => {
  const receipt: AcademicReceipt = { id: 'receipt', paymentId: 'payment', semesterId: semester.id, originalName: 'receipt.png',
    mimeType: 'image/png', size: 1000, storage: 'device', path: 'receipt', createdAt: '2025-02-01T12:00:00Z' };
  const summary = getAcademicSemesterSummary(semester, [payment('payment', 30000, 'Registration Fee')], [receipt]);
  assert.equal(summary.receipts.length, 1);
  assert.equal(summary.paid, 30000);
  assert.equal(summary.remaining, 23000);
});

test('legacy total is preserved without inventing a fee split or losing payments', () => {
  const legacy: Semester = { id: 'old', name: 'Old semester', status: 'Completed', totalFee: 78000 };
  assert.equal(getSemesterFees(legacy).reduce((sum, fee) => sum + fee.amount, 0), 78000);
  const duplicate = payment('same-id', 20000, 'Tuition Fee', 'old');
  const data = normalizeAcademicSnapshot({ semesters: [legacy], payments: [duplicate, duplicate], receipts: [] });
  assert.equal(data.payments.length, 1);
  assert.equal(getUniversityTotal(data.payments), 20000);
});

test('overpayment is a credit, not a negative payable; empty fees never produce NaN', () => {
  assert.equal(getAcademicSemesterSummary(semester, [payment('over', 60000, 'Registration Fee')]).credit, 7000);
  assert.equal(getAcademicSemesterSummary(semester, [payment('over', 60000, 'Registration Fee')]).remaining, 0);
  const empty = getAcademicSemesterSummary({ id: 'empty', name: 'Empty', totalFee: 0, status: 'Upcoming' }, []);
  assert.equal(empty.progress, 0);
  assert.equal(empty.remaining, 0);
});

test('invalid dates are rejected', () => {
  assert.equal(isAcademicDate('2025-02-31'), false);
  assert.equal(isAcademicDate('not-a-date'), false);
  assert.equal(isAcademicDate('2024-02-29'), true);
});

test('payment amounts retain cent precision and currency values never display NaN', () => {
  const tinyFees: Semester = { ...semester, totalFee: 1, fees: [{ id: 'tiny', category: 'Registration Fee', amount: 1 }] };
  const summary = getAcademicSemesterSummary(tinyFees, [payment('a', 0.1, 'Registration Fee'), payment('b', 0.2, 'Registration Fee')]);
  assert.equal(summary.paid, 0.3);
  assert.equal(summary.remaining, 0.7);
  assert.equal(formatCurrency(10000), '\u09f310,000');
  assert.equal(formatCurrency(10000.5), '\u09f310,000.50');
  assert.equal(formatCurrency(Number.NaN), '\u09f30');
});

test('receipt uploads validate content, not just a renamed file extension', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2lQAAAAASUVORK5CYII=', 'base64');
  assert.equal(await validateReceiptFile(new File([png], 'bank-receipt.png', { type: 'image/png' })), 'image/png');
  await assert.rejects(validateReceiptFile(new File(['<svg onload="alert(1)"/>'], 'fake.png', { type: 'image/png' })), /only genuine/);
});

test('empty and oversized files are rejected before saving a payment', async () => {
  await assert.rejects(validateReceiptFile(new File([], 'empty.pdf', { type: 'application/pdf' })), /under 5 MB/);
  await assert.rejects(validateReceiptFile(new File([new Uint8Array(MAX_RECEIPT_BYTES + 1)], 'large.pdf', { type: 'application/pdf' })), /under 5 MB/);
});