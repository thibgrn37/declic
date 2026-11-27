// Liaison Strava côté appli : connexion, puis récupération automatique des nouvelles séances.
// Ne fonctionne que sur la version hébergée (fonction serveur /api/strava). Ailleurs, rien ne s'affiche.
import { useEffect, useState } from 'react';
import { mergeWorkouts } from '../engine/training';
import type { State, Workout } from '../state/types';
import type { StravaReply } from '../server/strava';

const API = '/api/strava';
const SYNC_EVERY_MS = 10 * 60 * 1000;

let configP: Promise<string | null> | null = null;
/** Identifiant de l'appli Strava si le serveur est configuré, sinon null. */
export function stravaClientId(): Promise<string | null> {
  // Pas de serveur dans la version artifact (claude.ai) ni en fichier local.
  const hosted = location.protocol.startsWith('http') && !(window as unknown as { claude?: unknown }).claude;
  if (!hosted) return Promise.resolve(null);
  configP ??= fetch(API)
    .then((r) => (r.ok ? (r.json() as Promise<StravaReply>) : null))
    .then((r) => (r && r.ok && 'clientId' in r ? r.clientId : null))
    .catch(() => null);
  return configP;
}

export function useStravaClientId() {
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => { let on = true; stravaClientId().then((x) => on && setId(x)); return () => { on = false; }; }, []);
  return id;
}

export function connectStrava(clientId: string) {
  const redirect = `${location.origin}${location.pathname}?strava=1`;
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', approval_prompt: 'auto', scope: 'activity:read_all' });
  location.href = `https://www.strava.com/oauth/authorize?${q}`;
}

async function post(body: unknown): Promise<StravaReply> {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json() as Promise<StravaReply>;
}

/** Ajoute les séances reçues. Retourne le nombre de nouvelles. */
function absorb(s: State, list: Workout[]): number {
  const known = new Set((s.workouts || []).map((w) => w.id));
  const r = mergeWorkouts(s.workouts || [], list.filter((w) => !known.has(w.id)));
  s.workouts = r.list;
  return r.added;
}

export type SyncResult = { added: number } | { error: string };

/** Récupère les nouvelles activités. `update` applique la modification à l'état et l'enregistre. */
export async function syncStrava(s: State, update: (fn: (s: State) => void) => void): Promise<SyncResult> {
  const link = s.strava;
  if (!link) return { error: 'Strava n’est pas connecté' };
  // On repart 3 jours avant la dernière synchro pour rattraper une activité envoyée en retard par la montre.
  const after = link.lastSync ? Math.floor(link.lastSync / 1000) - 3 * 86400 : undefined;
  try {
    const r = await post({ action: 'activities', refreshToken: link.refreshToken, after });
    if (!r.ok) {
      if (r.status === 401) update((x) => { if (x.strava) x.strava.error = 'Connexion Strava expirée : reconnecte-toi.'; });
      return { error: r.error };
    }
    if (!('workouts' in r)) return { error: 'réponse inattendue' };
    let added = 0;
    update((x) => {
      added = absorb(x, r.workouts);
      x.strava = { ...x.strava!, refreshToken: r.refreshToken, lastSync: Date.now(), error: undefined };
    });
    return { added };
  } catch {
    return { error: 'Strava injoignable pour le moment' };
  }
}

/** Au retour de la page d'autorisation Strava : échange du code, puis première récupération. */
export async function finishStravaConnect(update: (fn: (s: State) => void) => void): Promise<SyncResult | null> {
  const q = new URLSearchParams(location.search);
  if (q.get('strava') !== '1') return null;
  history.replaceState(null, '', location.pathname);
  const code = q.get('code');
  if (!code || q.get('error')) return { error: 'Connexion Strava annulée' };
  if (!(q.get('scope') || '').includes('activity:read')) return { error: 'Il faut autoriser l’accès aux activités pour importer tes séances.' };
  try {
    const r = await post({ action: 'exchange', code });
    if (!r.ok || !('workouts' in r)) return { error: r.ok ? 'réponse inattendue' : r.error };
    let added = 0;
    update((x) => {
      added = absorb(x, r.workouts);
      x.strava = { refreshToken: r.refreshToken, athlete: r.athlete, lastSync: Date.now() };
    });
    return { added };
  } catch {
    return { error: 'Strava injoignable pour le moment' };
  }
}

/** Synchro automatique : au chargement, puis au retour sur l'appli, au plus toutes les 10 minutes. */
export function useStravaAutoSync(get: () => State, update: (fn: (s: State) => void) => void, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        const done = await finishStravaConnect(update);
        const s = get();
        if (!done && s.strava && !s.strava.error && Date.now() - (s.strava.lastSync || 0) > SYNC_EVERY_MS) await syncStrava(s, update);
      } finally { busy = false; }
    };
    void run();
    const onVis = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ready, get, update]);
}
