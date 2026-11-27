import { useEffect, useState, type FormEvent } from 'react';
import { appStore } from '../state/store';
import { cancelRecovery, cloudConfigured, currentAccount, onAccountChange, onRecovery, recoveryPending, resetPassword, updatePassword, type Account } from '../state/cloud';
import './sync.css';
import { installPrompt, isStandalone, onInstallPrompt } from '../pwa';

function useAccount(): Account | null | undefined {
  const [acc, setAcc] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    if (!cloudConfigured) return;
    let off = () => {};
    let alive = true;
    currentAccount().then((a) => alive && setAcc(a)).catch(() => alive && setAcc(null));
    onAccountChange((a) => alive && setAcc(a)).then((f) => { off = f; });
    return () => { alive = false; off(); };
  }, []);
  return acc;
}

function SignInForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const forgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setMsg({ ok: false, text: 'Indique d’abord ton e-mail ci-dessus.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await resetPassword(email.trim());
      setMsg({ ok: true, text: 'E-mail envoyé. Ouvre le lien reçu sur cet appareil pour choisir un nouveau mot de passe.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Une erreur est survenue.' });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'in') {
        await appStore.signIn(email.trim(), pw);
        onDone?.();
      } else {
        const pending = await appStore.signUp(email.trim(), pw);
        if (pending) setMsg({ ok: true, text: 'Compte créé. Clique sur le lien reçu par e-mail, puis connecte-toi ici.' });
        else onDone?.();
        if (pending) setMode('in');
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Une erreur est survenue.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Se connecter</button>
        <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Créer mon compte</button>
      </div>
      <label className="field">E-mail
        <input type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">Mot de passe
        <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <button className="btn wide" disabled={busy}>{busy ? 'Un instant…' : mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
      {mode === 'in' && <button type="button" className="link small" disabled={busy} onClick={forgot}>Mot de passe oublié ?</button>}
      {msg && <p className={'small ' + (msg.ok ? 'okmsg' : 'errmsg')} role="status">{msg.text}</p>}
    </form>
  );
}

/** Carte « Sauvegarde en ligne » de l'écran Progrès (version hébergée seulement). */
export function SyncCard() {
  const acc = useAccount();
  const [busy, setBusy] = useState(false);
  if (!cloudConfigured) return null;
  return (
    <div className="card">
      <h3>Sauvegarde en ligne</h3>
      {acc === undefined ? <p className="small muted">Chargement…</p> : acc ? (
        <>
          <p className="small muted">Connecté avec <b>{acc.email}</b>. Tes données se synchronisent entre ton téléphone et ton ordinateur.</p>
          <button className="btn ghost" disabled={busy} onClick={async () => { setBusy(true); await appStore.signOut().catch(() => {}); setBusy(false); }}>Se déconnecter</button>
        </>
      ) : (
        <>
          <p className="small muted">Connecte-toi pour sauvegarder tes données et les retrouver sur tous tes appareils. Sans compte, elles restent sur cet appareil.</p>
          <SignInForm />
        </>
      )}
    </div>
  );
}

/** Bandeau du premier lancement : retrouver ses données au lieu de refaire le bilan. */
export function SignInBanner() {
  const acc = useAccount();
  const [open, setOpen] = useState(false);
  if (acc !== null) return null;
  return (
    <div className="app banner">
      <div className="card">
        {open ? (
          <>
            <div className="top"><h3>Retrouver mes données</h3><button className="link" onClick={() => setOpen(false)}>Fermer</button></div>
            <SignInForm onDone={() => setOpen(false)} />
          </>
        ) : (
          <div className="top">
            <p className="small">Tu as déjà un compte Déclic ?</p>
            <button className="btn soft small" onClick={() => setOpen(true)}>Se connecter</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Carte « Installer l'appli » : bouton sur Android/Chrome, mode d'emploi sur iPhone. */
export function InstallCard() {
  const [canPrompt, setCanPrompt] = useState(Boolean(installPrompt()));
  useEffect(() => onInstallPrompt(() => setCanPrompt(Boolean(installPrompt()))), []);
  if (!cloudConfigured || isStandalone()) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="card">
      <h3>Installer Déclic sur ton téléphone</h3>
      {canPrompt ? (
        <button className="btn" onClick={() => installPrompt()?.prompt()}>Installer l’appli</button>
      ) : ios ? (
        <p className="small muted">Dans Safari, touche le bouton Partager puis « Sur l’écran d’accueil ». Déclic s’ouvrira ensuite en plein écran, comme une appli.</p>
      ) : (
        <p className="small muted">Ouvre cette page sur ton téléphone. Sur Android, choisis « Installer l’application » dans le menu de Chrome. Sur iPhone, dans Safari, touche Partager puis « Sur l’écran d’accueil ».</p>
      )}
    </div>
  );
}

/** Après le lien « mot de passe oublié » : choisir un nouveau mot de passe. */
export function PasswordReset() {
  const [open, setOpen] = useState(recoveryPending());
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => onRecovery(() => setOpen(recoveryPending())), []);
  if (!cloudConfigured || !open) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setErr('Les deux mots de passe sont différents.'); return; }
    setBusy(true);
    setErr('');
    try {
      await updatePassword(pw);
      await appStore.reconnect();
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="pwreset-title">
      <form className="card sheet" onSubmit={submit}>
        <h3 id="pwreset-title">Nouveau mot de passe</h3>
        <p className="small muted">Choisis le mot de passe que tu utiliseras sur tous tes appareils.</p>
        <label className="field">Nouveau mot de passe
          <input type="password" autoComplete="new-password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <label className="field">Confirme-le
          <input type="password" autoComplete="new-password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </label>
        <button className="btn wide" disabled={busy}>{busy ? 'Un instant…' : 'Enregistrer'}</button>
        <button type="button" className="link small" onClick={() => { cancelRecovery(); setOpen(false); }}>Annuler</button>
        {err && <p className="small errmsg" role="status">{err}</p>}
      </form>
    </div>
  );
}
