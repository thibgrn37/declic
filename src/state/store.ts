import { todayKey, mondayOf } from './dates';
import type { State } from './types';

export function freshState(): State {
  const t = todayKey();
  return {
    v: 2,
    createdAt: t,
    programStart: mondayOf(t),
    profile: null,
    assessments: [],
    personal: {
      gesture: '', place: '', cueInstr: '', cueMotiv: '', negative: '', reframe: '', strength: '', trigger: '',
      routine: [],
      goals: { result: '', perf: '', process: ['', ''] },
      goalReviews: [],
    },
    levels: {},
    sessions: [],
    checkins: {},
    debriefs: [],
    plans: {},
    days: {},
    badges: [],
  };
}

export function migrate(raw: unknown): State {
  const f = freshState();
  if (!raw || typeof raw !== 'object' || (raw as State).v !== 2) return f;
  const s = raw as State;
  return { ...f, ...s, personal: { ...f.personal, ...s.personal, goals: { ...f.personal.goals, ...(s.personal?.goals || {}) } } };
}

/** Garde le document sous une taille raisonnable. */
export function trim(s: State) {
  if (s.sessions.length > 600) s.sessions = s.sessions.slice(-600);
  if (s.debriefs.length > 200) s.debriefs.length = 200;
  const ck = Object.keys(s.checkins).sort();
  while (ck.length > 365) delete s.checkins[ck.shift()!];
  const pk = Object.keys(s.plans).sort();
  while (pk.length > 40) delete s.plans[pk.shift()!];
  const dk = Object.keys(s.days).sort();
  while (dk.length > 500) delete s.days[dk.shift()!];
}

/* ---- Persistance : compte Claude quand l'appli tourne comme artifact, sinon le navigateur ---- */

const LS_KEY = 'declic-state-v2';
type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> };
type ClaudeWindow = { claude?: { use(name: string): Promise<any> } };

export type SaveStatus = 'chargement' | 'compte' | 'appareil' | 'erreur' | 'enregistrement';

export class Store {
  private doc: DocRef | null = null;
  private writing = false;
  private dirty = false;
  private latest: State | null = null;
  ready = false;
  onStatus: (s: SaveStatus) => void = () => {};

  readLocal(): State | null {
    try {
      const r = localStorage.getItem(LS_KEY);
      return r ? migrate(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }

  async connect(): Promise<State | null> {
    const w = window as unknown as ClaudeWindow;
    try {
      if (!w.claude?.use) throw new Error('hors artifact');
      const timeout = new Promise<null>((r) => setTimeout(() => r(null), 10000));
      const pair = await Promise.race([Promise.all([w.claude.use('db'), w.claude.use('user')]), timeout]);
      if (!pair) throw new Error('délai');
      const [db, user] = pair;
      const id = user ? await user.id() : null;
      if (!db || !id) throw new Error('pas de base');
      this.doc = db.collection('data/users/' + id).doc('state') as DocRef;
      const snap = await this.doc.get();
      this.ready = true;
      this.onStatus('compte');
      if (snap.exists) {
        const d = snap.data();
        return migrate(JSON.parse(String(d?.json ?? 'null')));
      }
      return null;
    } catch {
      this.ready = true;
      this.onStatus('appareil');
      return null;
    }
  }

  save(s: State) {
    trim(s);
    this.latest = s;
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ }
    if (!this.ready || !this.doc) return;
    this.dirty = true;
    void this.flush();
  }

  private async flush() {
    if (this.writing || !this.doc) return;
    this.writing = true;
    while (this.dirty) {
      this.dirty = false;
      this.onStatus('enregistrement');
      try {
        await this.doc.set({ v: 2, json: JSON.stringify(this.latest), at: Date.now() });
        this.onStatus('compte');
      } catch {
        this.onStatus('erreur');
      }
    }
    this.writing = false;
  }
}
