import { useState } from 'react';
import { CheckCircle2, Cloud, HardDrive, KeyRound, Loader2, Mail, ShieldCheck, UploadCloud } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { academicSupabase } from '../../services/academicCloud';
import { AcademicDialog } from './AcademicDialog';

const MIN_PASSWORD_LENGTH = 8;

type SignInMode = 'password' | 'link';

export function AcademicCloudModal({ onClose }: { onClose: () => void }) {
  const {
    academicUser, academicCloudConfigured, importLocalRecords, academicLoading,
    financeCloudLoading, financeCloudError, showToast,
  } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<SignInMode>('password');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);

  const signInWithPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!academicSupabase || busy) return;
    const trimmed = email.trim();
    setBusy(true); setError(''); setMessage('');
    try {
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      }
      // A new address signs up; an existing one signs in. Either way the app ends up
      // with a session, so a first-time user is not told to "check their email".
      const signIn = await academicSupabase.auth.signInWithPassword({ email: trimmed, password });
      if (signIn.error) {
        if (signIn.error.code !== 'invalid_credentials') throw signIn.error;
        const signUp = await academicSupabase.auth.signUp({ email: trimmed, password });
        if (signUp.error) throw signUp.error;
        if (!signUp.data.session) {
          setMessage('Account created. Confirm your email address to finish signing in.');
          setPassword('');
          return;
        }
      }
      setPassword('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in to the cloud.'); }
    finally { setBusy(false); }
  };

  const sendLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!academicSupabase || busy) return;
    setBusy(true); setError(''); setMessage('');
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
        <h3>Cloud is not available here</h3>
        <p>This build has no Supabase credentials, so your records stay on this device only. Nothing is being uploaded.</p>
        <ol>
          <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your host's environment variables. The <code>VITE_</code> names also work.</li>
          <li>Redeploy so the values are inlined into the app bundle.</li>
          <li>Sign in here to use private cloud storage.</li>
        </ol>
        <p className="academic-storage-hint"><ShieldCheck size={15} />Never put a service-role key in the browser.</p>
        <button type="button" className="academic-button primary" onClick={onClose}>Continue on this device</button>
      </> : academicUser ? <>
        <h3>Connected securely</h3><p>{academicUser.email}</p>
        <p>Your cloud records belong only to this account. Device records stay separate until you explicitly approve a backup.</p>
        <label className="academic-import-consent"><input type="checkbox" checked={confirmImport} onChange={(event) => setConfirmImport(event.target.checked)} />Back up this device's Monthly, Extra Card, academic and receipt records to my account. Matching IDs will be updated; other cloud records are kept.</label>
        <button className="academic-button primary" type="button" disabled={busy || academicLoading || financeCloudLoading || !confirmImport} onClick={() => void importRecords()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}Back up device records</button>
        <button className="academic-button secondary" type="button" disabled={busy} onClick={() => void signOut()}>Sign out of cloud</button>
      </> : <>
        <h3>Keep your receipts with you</h3>
        <p>Sign in to reach your private academic records on any device. A new address becomes your account.</p>
        <div className="academic-cloud-tabs" role="tablist" aria-label="Sign-in method">
          <button type="button" role="tab" id="academic-cloud-tab-password" aria-selected={mode === 'password'}
            aria-controls="academic-cloud-panel-password" className={`academic-cloud-tab${mode === 'password' ? ' active' : ''}`}
            onClick={() => { setMode('password'); setError(''); setMessage(''); }}>
            <KeyRound size={14} />Password
          </button>
          <button type="button" role="tab" id="academic-cloud-tab-link" aria-selected={mode === 'link'}
            aria-controls="academic-cloud-panel-link" className={`academic-cloud-tab${mode === 'link' ? ' active' : ''}`}
            onClick={() => { setMode('link'); setError(''); setMessage(''); }}>
            <Mail size={14} />Email link
          </button>
        </div>
        {mode === 'password' ? (
          <form onSubmit={(event) => void signInWithPassword(event)} id="academic-cloud-panel-password"
            role="tabpanel" aria-labelledby="academic-cloud-tab-password">
            <label htmlFor="academic-cloud-email">Email address
              <input id="academic-cloud-email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label htmlFor="academic-cloud-password">Password
              <input id="academic-cloud-password" type="password" autoComplete="current-password" required
                minLength={MIN_PASSWORD_LENGTH} value={password}
                onChange={(event) => setPassword(event.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />
            </label>
            <button className="academic-button primary" type="submit" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}Sign in or create account
            </button>
          </form>
        ) : (
          <form onSubmit={(event) => void sendLink(event)} id="academic-cloud-panel-link"
            role="tabpanel" aria-labelledby="academic-cloud-tab-link">
            <label htmlFor="academic-cloud-email">Email address
              <input id="academic-cloud-email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <button className="academic-button primary" type="submit" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}Send sign-in link
            </button>
          </form>
        )}
        <p className="academic-storage-hint"><ShieldCheck size={15} />Private bucket. Owner-only access. App Lock stays enabled.</p>
      </>}
      {message && <p className="academic-success" role="status"><CheckCircle2 size={16} />{message}</p>}
      {error && <p className="academic-error" role="alert">{error}</p>}
      {financeCloudError && !error && <p className="academic-error" role="alert">{financeCloudError}</p>}
    </div>
  </AcademicDialog>;
}