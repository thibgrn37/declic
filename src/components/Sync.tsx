import { useEffect, useState, type FormEvent } from 'react';
import { appStore } from '../state/store';
import { cloudConfigured, currentAccount, onAccountChange, type Account } from '../state/cloud';
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
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">Mot de passe
        <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <button className="btn wide" disabled={busy}>{busy ? 'Un instant…' : mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
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
