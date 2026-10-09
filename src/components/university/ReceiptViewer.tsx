import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AcademicReceipt } from '../../types';
import { receiptFileLabel } from '../../services/academicReceipts';
import { AcademicDialog } from './AcademicDialog';

export function ReceiptViewer({ receipt, onClose }: { receipt: AcademicReceipt; onClose: () => void }) {
  const { readAcademicReceipt } = useApp();
  const read = useRef(readAcademicReceipt);
  read.current = readAcademicReceipt;
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    setUrl(''); setError('');
    void read.current(receipt).then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch((cause: unknown) => { if (alive) setError(cause instanceof Error ? cause.message : 'Could not open receipt.'); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [receipt.id, retry]);
  const isPdf = receipt.mimeType === 'application/pdf';
  return <AcademicDialog title="Payment receipt" subtitle={receipt.originalName} onClose={onClose} wide>
    <div className="academic-receipt-viewer">
      {error ? <div className="academic-viewer-empty"><FileText size={32} /><p role="alert">{error}</p><button type="button" className="academic-button secondary" onClick={() => setRetry((value) => value + 1)}><RotateCcw size={15} />Try again</button></div>
        : !url ? <div className="academic-viewer-empty"><Loader2 size={28} className="animate-spin" /><p>Opening your receipt...</p></div>
          : isPdf ? <><iframe src={url} title={receipt.originalName} sandbox="" /><p className="academic-form-hint">If the PDF preview is unavailable, use Download receipt.</p></>
            : <img src={url} alt={`Receipt: ${receipt.originalName}`} />}
      <div className="academic-receipt-viewer-footer"><span><ShieldCheck size={15} />Private attachment <span className="academic-size-text">{receiptFileLabel(receipt.size)}</span></span>
        {url && <a className="academic-button primary" href={url} download={receipt.originalName}><Download size={15} />Download receipt</a>}
      </div>
    </div>
  </AcademicDialog>;
}