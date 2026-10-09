import type { AcademicReceipt } from '../types';

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MAX_PAYMENT_RECEIPTS = 5;
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const DB_NAME = 'moneymate-academic-receipts';

export async function validateReceiptFile(file: File): Promise<AcademicReceipt['mimeType']> {
  if (!file.size || file.size > MAX_RECEIPT_BYTES) throw new Error(`${file.name}: choose a file under 5 MB.`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = new TextDecoder().decode(bytes);
  let detected: AcademicReceipt['mimeType'] | undefined;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) detected = 'image/jpeg';
  if (bytes[0] === 0x89 && ascii.slice(1, 4) === 'PNG') detected = 'image/png';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') detected = 'image/webp';
  if (ascii.startsWith('%PDF-')) detected = 'application/pdf';
  if (!detected || (file.type && file.type !== detected)) throw new Error(`${file.name}: only genuine JPG, PNG, WebP and PDF files are supported.`);
  return detected;
}

function openReceiptDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Receipt storage is unavailable in this browser.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open receipt storage. Please allow browser storage.'));
  });
}

async function writeFiles(operation: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openReceiptDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite');
    operation(transaction.objectStore('files'));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('Receipt could not be saved. Device storage may be full.')); };
  });
}

export const deviceReceipts = {
  putMany: (files: { id: string; blob: Blob }[]) => writeFiles((store) => files.forEach((file) => store.put(file.blob, file.id))),
  removeMany: (ids: string[]) => writeFiles((store) => ids.forEach((id) => store.delete(id))),
  async read(id: string): Promise<Blob> {
    const db = await openReceiptDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction('files', 'readonly').objectStore('files').get(id);
      request.onsuccess = () => {
        db.close();
        if (request.result instanceof Blob) resolve(request.result);
        else reject(new Error('Receipt is not on this device. Its metadata may have been imported without the file.'));
      };
      request.onerror = () => { db.close(); reject(new Error('Could not read this receipt.')); };
    });
  },
};

export const receiptFileLabel = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;