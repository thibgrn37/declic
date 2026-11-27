import { todayKey, mondayOf } from './dates';
import type { State } from './types';
import * as cloud from './cloud';

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

/* ---- Persistance ----
 * Toujours dans le navigateur (localStorage), plus une copie distante :
 *  - le compte claude.ai quand l'appli tourne comme artifact ;
 *  - Supabase quand l'appli est hébergée (Vercel) et que l'utilisateur est connecté.
 * En cas d'écart entre appareils, la version modifiée le plus récemment l'emporte. */

const LS_KEY = 'declic-state-v2';
const META_KEY = 'declic-sync-v1';
type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> };
type ClaudeWindow = { claude?: { use(name: string): Promise<any> } };

export type SaveStatus = 'chargement' | 'compte' | 'appareil' | 'erreur' | 'enregistrement';

/** editedAt : dernière modification sur cet appareil. syncedAt : version alignée avec la copie distante. */
type Meta = { editedAt: number; syncedAt: number };

interface Remote {
  load(): Promise<{ state: State; at: number } | null>;
  save(s: State, at: number): Promise<void>;
}

function claudeRemote(doc: DocRef): Remote {
  return {
    async load() {
      const snap = await doc.get();
      if (!snap.exists) return null;
      const d = snap.data();
      return { state: migrate(JSON.parse(String(d?.json ?? 'null'))), at: Number(d?.at ?? 0) };
    },
    save: (s, at) => doc.set({ v: 2, json: JSON.stringify(s), at }),
  };
}

function cloudRemote(userId: string): Remote {
  return {
    async load() {
      const r = await cloud.loadRemote();
      return r ? { state: migrate(r.state), at: r.at } : null;
    },
    save: (s, at) => cloud.saveRemote(userId, s, at),
  };
}

/** Un état sans bilan terminé ne doit jamais écraser des données distantes. */
const hasData = (s: State | null) => Boolean(s && s.profile && s.assessments.length);

export class Store {
  private remote: Remote | null = null;
  private busy = false;
  private dirty = false;
  private latest: State | null = null;
  private meta: Meta = { editedAt: 0, syncedAt: 0 };
  private listening = false;
  ready = false;
  onStatus: (s: SaveStatus) => void = () => {};
  /** Appelé quand une version plus récente arrive d'un autre appareil. */
  onRemote: (s: State) => void = () => {};

  constructor() {
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      if (m && typeof m.editedAt === 'number') this.meta = { editedAt: m.editedAt, syncedAt: Number(m.syncedAt) || 0 };
    } catch { /* stockage indisponible */ }
  }

  readLocal(): State | null {
    try {
      const r = localStorage.getItem(LS_KEY);
      const s = r ? migrate(JSON.parse(r)) : null;
      this.latest = s;
      return s;
    } catch {
      return null;
    }
  }

  private writeLocal(s: State) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      localStorage.setItem(META_KEY, JSON.stringify(this.meta));
    } catch { /* stockage indisponible */ }
  }

  private async pickRemote(): Promise<Remote | null> {
    const w = window as unknown as ClaudeWindow;
    if (w.claude?.use) {
      try {
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), 10000));
        const pair = await Promise.race([Promise.all([w.claude.use('db'), w.claude.use('user')]), timeout]);
        const [db, user] = pair || [];
        const id = user ? await user.id() : null;
        if (db && id) return claudeRemote(db.collection('data/users/' + id).doc('state') as DocRef);
      } catch { /* on tente la suite */ }
    }
    const acc = await cloud.currentAccount().catch(() => null);
    return acc ? cloudRemote(acc.id) : null;
  }

  /** Se branche à la copie distante. Renvoie l'état distant s'il faut l'adopter, sinon null. */
  async connect(): Promise<State | null> {
    this.listen();
    this.remote = await this.pickRemote();
    this.ready = true;
    if (!this.remote) {
      this.onStatus('appareil');
      return null;
    }
    try {
      const r = await this.remote.load();
      if (r && hasData(r.state) && (r.at > this.meta.editedAt || !hasData(this.latest))) {
        this.adopt(r.state, r.at);
        this.onStatus('compte');
        return r.state;
      }
      if (hasData(this.latest) && (!r || this.meta.editedAt > r.at)) {
        this.dirty = true;
        await this.flush();
      } else {
        if (r) this.meta.syncedAt = r.at;
        this.onStatus('compte');
      }
      return null;
    } catch {
      this.onStatus('erreur');
      return null;
    }
  }

  private adopt(s: State, at: number) {
    this.latest = s;
    this.meta = { editedAt: at, syncedAt: at };
    this.writeLocal(s);
  }

  /** Au retour sur l'appli ou au retour du réseau : envoie ce qui attend, ou récupère la version d'un autre appareil. */
  async refresh() {
    if (!this.remote || this.busy) return;
    if (this.meta.editedAt > this.meta.syncedAt) {
      this.dirty = true;
      await this.flush();
      return;
    }
    try {
      const r = await this.remote.load();
      if (r && r.at > this.meta.syncedAt && hasData(r.state)) {
        this.adopt(r.state, r.at);
        this.onRemote(r.state);
      }
      this.onStatus('compte');
    } catch {
      /* hors ligne : on réessaiera */
    }
  }

  private listen() {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('online', () => void this.refresh());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.refresh();
    });
  }

  save(s: State) {
    trim(s);
    this.latest = s;
    this.meta.editedAt = Date.now();
    this.writeLocal(s);
    if (!this.ready || !this.remote) return;
    this.dirty = true;
    void this.flush();
  }

  private async flush() {
    if (this.busy || !this.remote) return;
    this.busy = true;
    while (this.dirty && this.latest) {
      this.dirty = false;
      this.onStatus('enregistrement');
      if (!this.meta.editedAt) this.meta.editedAt = Date.now(); // données d'avant la synchro, sans date
      const at = this.meta.editedAt;
      try {
        await this.remote.save(this.latest, at);
        this.meta.syncedAt = Math.max(this.meta.syncedAt, at);
        try { localStorage.setItem(META_KEY, JSON.stringify(this.meta)); } catch { /* rien */ }
        this.onStatus('compte');
      } catch {
        this.onStatus('erreur');
        break;
      }
    }
    this.busy = false;
  }

  /* ---- Compte en ligne (version hébergée) ---- */

  async signIn(email: string, password: string) {
    await cloud.signIn(email, password);
    await this.reconnect();
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const pending = await cloud.signUp(email, password);
    if (!pending) await this.reconnect();
    return pending;
  }

  async signOut() {
    await cloud.signOut();
    this.remote = null;
    this.meta.syncedAt = 0;
    this.onStatus('appareil');
  }

  async reconnect() {
    const remote = await this.connect();
    if (remote) this.onRemote(remote);
  }
}

export const appStore = new Store();
