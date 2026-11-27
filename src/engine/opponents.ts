import type { Debrief, IssueKey, MatchInfo, SquashnetMatch, State, TurningKey } from '../state/types';

export const TURNING: Record<TurningKey, string> = {
  mene: 'Mené au score',
  avance: 'Avance perdue',
  fin_jeu: 'Fins de jeu serrées',
  arbitre: 'Décision d’arbitre',
  physique: 'Coup de fatigue',
  adversaire: 'Jeu de l’adversaire',
};

/** Nom comparable : majuscules, sans accents ni espaces superflus. */
export const normName = (n: string) =>
  n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 '-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
/** Clé d'un adversaire, insensible à l'ordre nom / prénom (« Antoine Pillot » = « PILLOT ANTOINE »). */
const nameKey = (n: string) => normName(n).split(' ').sort().join(' ');

/** « 11-7 9-11 11/5 12–10 » : un jeu par paire de nombres, dans l'ordre moi-adversaire. */
export function parseScore(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(/(\d{1,2})\s*[-–/:]\s*(\d{1,2})/g)) out.push([+m[1], +m[2]]);
  return out;
}

export const fmtScore = (games: [number, number][]) => games.map(([a, b]) => `${a}-${b}`).join(' ');

/** Jeux gagnés de chaque côté, et vainqueur (null si le score ne tranche pas). */
export function matchResult(games: [number, number][]) {
  const me = games.filter(([a, b]) => a > b).length;
  const them = games.filter(([a, b]) => b > a).length;
  return { me, them, won: me === them ? null : me > them };
}

export interface OpponentMatch {
  date: string;
  match: MatchInfo;
  won: boolean | null;
  me: number;
  them: number;
  debrief?: Debrief;
  /** Match officiel Squashnet (tournoi, classements). */
  official?: SquashnetMatch;
}

export interface OpponentCard {
  name: string;
  /** Dernier classement connu de l'adversaire (Squashnet). */
  cls?: string;
  matches: OpponentMatch[];
  wins: number;
  losses: number;
  /** Obstacles mentaux relevés contre cet adversaire, du plus fréquent au moins fréquent. */
  issues: { issue: IssueKey; n: number }[];
  turning: { key: TurningKey; n: number }[];
  /** Dernière consigne « je garde » notée contre lui. */
  lastKeep: string;
}

function count<K extends string>(list: K[]) {
  const m = new Map<K, number>();
  list.forEach((k) => m.set(k, (m.get(k) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Fiches des adversaires rencontrés (débriefs et matchs Squashnet), du plus récent au plus ancien. */
export function opponentCards(s: State): OpponentCard[] {
  const byName = new Map<string, OpponentCard>();
  const card = (name: string) => {
    const k = nameKey(name);
    let c = byName.get(k);
    if (!c) { c = { name: name.trim(), matches: [], wins: 0, losses: 0, issues: [], turning: [], lastKeep: '' }; byName.set(k, c); }
    return c;
  };
  for (const m of s.squashnet?.matches || []) {
    const c = card(m.opponent);
    const r = m.special ? { me: 0, them: 0, won: null } : matchResult(m.games);
    c.matches.push({ date: m.date, match: { opponent: m.opponent, games: m.games, source: 'squashnet' }, official: m, ...r });
  }
  for (const d of s.debriefs) {
    if (!d.match?.opponent.trim()) continue;
    const c = card(d.match.opponent);
    // Un débrief du même jour qu'un match Squashnet contre le même adversaire complète ce match.
    const same = c.matches.find((m) => m.official && !m.debrief && m.date === d.date);
    if (same) { same.debrief = d; same.match = { ...same.match, turning: d.match.turning }; continue; }
    c.matches.push({ date: d.date, debrief: d, match: d.match, ...matchResult(d.match.games) });
  }
  for (const c of byName.values()) {
    c.matches.sort((a, b) => b.date.localeCompare(a.date));
    const off = c.matches.find((m) => m.official);
    c.name = c.matches[0].match.opponent.trim();
    if (off) { c.name = off.official!.opponent; c.cls = off.official!.oppClass; }
    c.wins = c.matches.filter((m) => m.won === true).length;
    c.losses = c.matches.filter((m) => m.won === false).length;
    c.lastKeep = c.matches.find((m) => m.debrief?.keep.trim())?.debrief!.keep.trim() || '';
    const issues: IssueKey[] = [];
    c.matches.forEach(({ debrief: d }) => d && new Set([...(d.issue ? [d.issue] : []), ...(d.detected || [])]).forEach((k) => issues.push(k)));
    c.issues = count(issues).map(([issue, n]) => ({ issue, n }));
    c.turning = count(c.matches.flatMap((m) => (m.match.turning ? [m.match.turning] : []))).map(([key, n]) => ({ key, n }));
  }
  return [...byName.values()].sort((a, b) => b.matches[0].date.localeCompare(a.matches[0].date));
}

export const findOpponent = (s: State, name: string) => {
  const k = nameKey(name);
  return k ? opponentCards(s).find((c) => nameKey(c.name) === k) : undefined;
};
