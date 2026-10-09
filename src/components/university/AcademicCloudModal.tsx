import { useState } from 'react';
import { CheckCircle2, Cloud, HardDrive, Loader2, Mail, ShieldCheck, UploadCloud } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { academicSupabase } from '../../services/academicCloud';
import { AcademicDialog } from './AcademicDialog';

export function AcademicCloudModal({ onClose }: { onClose: () => void }) {
  const {
    academicUser, academicCloudConfigured, importLocalRecords, academicLoading,
    financeCloudLoading, financeCloudError, showToast,
  } = useApp();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);

  const sendLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!academicSupabase || busy) return;
    setBusy(true); setError('');
    try {
      const { error: authError } = await academicSupabase.auth.signInWithOtp({
        email: email.trim(), options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
      });
      if (authError) throw authError;
      setMessage('Check your email for a secure sign-in link. Your app PIN will still be required.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send a sign-in link.'); }
    finally { setBusy(false); }
  };
  const importRecords = async () => {
    setBusy(true); setError('');
    try {
      await importLocalRecords();
      showToast('Device financial and academic records backed up to your private cloud.');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not back up device records. Retrying is safe.');
    }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    if (!academicSupabase) return;
    setBusy(true);
    const { error: authError } = await academicSupabase.auth.signOut({ scope: 'local' });
    if (authError) setError(authError.message);
    else { showToast('Cloud disconnected. Your device records are unchanged.'); onClose(); }
    setBusy(false);
  };

  return <AcademicDialog title="Private academic cloud" subtitle="Back up fee records and receipts with Supabase." onClose={onClose} busy={busy}>
    <div className="academic-form academic-cloud-content">
      <div className="academic-cloud-symbol">{academicUser ? <Cloud size={28} /> : <HardDrive size={28} />}</div>
      {!academicCloudConfigured ? <>
        <h3>Saved on this device</h3><p>Your tracker and receipt uploads work locally right now. Supabase has not been configured yet.</p>
        <ol><li>Run the provided academic SQL migration in Supabase.</li><li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from <code>.env.example</code>.</li><li>Restart the app, then sign in here to use private cloud storage.</li></ol>
        <p className="academic-storage-hint"><ShieldCheck size={15} />Never put a service-role key in the browser.</p>
        <button type="button" className="academic-button primary" onClick={onClose}>Continue on this device</button>
      </> : academicUser ? <>
        <h3>Connected securely</h3><p>{academicUser.email}</p>
        <p>Your cloud records belong only to this account. Device records stay separate until you explicitly approve a backup.</p>
        <label className="academic-import-consent"><input type="checkbox" checked={confirmImport} onChange={(event) => setConfirmImport(event.target.checked)} />Back up this device's Monthly, Extra Card, academic and receipt records to my account. Matching IDs will be updated; other cloud records are kept.</label>
        <button className="academic-button primary" type="button" disabled={busy || academicLoading || financeCloudLoading || !confirmImport} onClick={() => void importRecords()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}Back up device records</button>
        <button className="academic-button secondary" type="button" disabled={busy} onClick={() => void signOut()}>Sign out of cloud</button>
      </> : <form onSubmit={(event) => void sendLink(event)}>
        <h3>Keep your receipts with you</h3><p>Sign in with an email link to access your private academic records on another device.</p>
        <label htmlFor="academic-cloud-email">Email address<input id="academic-cloud-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <button className="academic-button primary" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}Send sign-in link</button>
        <p className="academic-storage-hint"><ShieldCheck size={15} />Private bucket. Owner-only access. App Lock stays enabled.</p>
      </form>}
      {message && <p className="academic-success" role="status"><CheckCircle2 size={16} />{message}</p>}
      {error && <p className="academic-error" role="alert">{error}</p>}
      {financeCloudError && !error && <p className="academic-error" role="alert">{financeCloudError}</p>}
    </div>
  </AcademicDialog>;
}