// Liaison intervals.icu côté appli : clé personnelle, puis récupération automatique des nouvelles séances.
// Ne fonctionne que sur la version hébergée (fonction serveur /api/intervals).
import { useEffect } from 'react';
import { addDays, todayKey } from '../state/dates';
import { mergeWorkouts } from '../engine/training';
import type { State, Workout } from '../state/types';
import type { IcuReply } from '../../api/intervals';

const API = '/api/intervals';
const SYNC_EVERY_MS = 10 * 60 * 1000;

/** Vrai sur la version hébergée ; faux dans l'artifact claude.ai et en fichier local. */
export const intervalsAvailable = () =>
  typeof location !== 'undefined' && location.protocol.startsWith('http') && !(window as unknown as { claude?: unknown }).claude;

/** Ajoute les séances reçues sans doublon, en complétant celles déjà présentes. */
export function absorb(s: State, list: Workout[]): { added: number; already: number } {
  const r = mergeWorkouts(s.workouts || [], list);
  s.workouts = r.list;
  return { added: r.added, already: list.length - r.added };
}

/** `received` : séances renvoyées par intervals.icu ; `already` : celles qui étaient déjà dans Déclic. */
export type SyncResult = { added: number; already: number; received: number } | { error: string };

async function fetchWorkouts(apiKey: string, oldest: string, sport?: string): Promise<IcuReply> {
  let r: Response;
  try {
    r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, oldest, sport }) });
  } catch {
    return { ok: false, error: 'Pas de connexion internet.', status: 0 };
  }
  // Une réponse qui n'est pas du JSON vient de notre serveur, pas d'intervals.icu : on le dit clairement.
  const data = (await r.json().catch(() => null)) as IcuReply | null;
  return data ?? { ok: false, error: `Le relais de Déclic ne répond pas (erreur ${r.status}).`, status: r.status };
}

const profileSport = (s: State) => (s.profile?.sport ? s.profile.sport[0].toUpperCase() + s.profile.sport.slice(1) : undefined);

/** Première connexion : vérifie la clé et récupère les 30 derniers jours. */
export async function connectIntervals(apiKey: string, s: State, update: (fn: (s: State) => void) => void): Promise<SyncResult> {
  try {
    const r = await fetchWorkouts(apiKey, addDays(todayKey(), -30), profileSport(s));
    if (!r.ok) return { error: r.error };
    let res = { added: 0, already: 0 };
    update((x) => { res = absorb(x, r.workouts); x.intervals = { apiKey, lastSync: Date.now() }; });
    return { ...res, received: r.workouts.length };
  } catch (e) {
    return { error: `Connexion impossible (${(e as Error).message}).` };
  }
}

/** Récupère les séances depuis la dernière synchro (3 jours de marge pour une montre synchronisée en retard). */
export async function syncIntervals(s: State, update: (fn: (s: State) => void) => void): Promise<SyncResult> {
  const link = s.intervals;
  if (!link) return { error: 'intervals.icu n’est pas connecté' };
  const since = link.lastSync ? new Date(link.lastSync - 3 * 86400e3) : new Date(Date.now() - 30 * 86400e3);
  const p = (n: number) => String(n).padStart(2, '0');
  const oldest = `${since.getFullYear()}-${p(since.getMonth() + 1)}-${p(since.getDate())}`;
  try {
    const r = await fetchWorkouts(link.apiKey, oldest, profileSport(s));
    if (!r.ok) {
      if (r.status === 401) update((x) => { if (x.intervals) x.intervals.error = r.error; });
      return { error: r.error };
    }
    let res = { added: 0, already: 0 };
    update((x) => { res = absorb(x, r.workouts); if (x.intervals) { x.intervals.lastSync = Date.now(); delete x.intervals.error; } });
    return { ...res, received: r.workouts.length };
  } catch {
    return { error: 'intervals.icu injoignable pour le moment.' };
  }
}

/** Synchro automatique : au chargement, puis au retour sur l'appli, au plus toutes les 10 minutes. */
export function useIntervalsAutoSync(get: () => State, update: (fn: (s: State) => void) => void, ready: boolean) {
  useEffect(() => {
    if (!ready || !intervalsAvailable()) return;
    let busy = false;
    const run = async () => {
      const s = get();
      if (busy || !s.intervals || s.intervals.error || Date.now() - (s.intervals.lastSync || 0) < SYNC_EVERY_MS) return;
      busy = true;
      try { await syncIntervals(s, update); } finally { busy = false; }
    };
    void run();
    const onVis = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ready, get, update]);
}
