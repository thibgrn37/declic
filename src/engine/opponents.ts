import type { Debrief, IssueKey, MatchInfo, State, TurningKey } from '../state/types';

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
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 '-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

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

export interface OpponentCard {
  name: string;
  matches: { date: string; debrief: Debrief; match: MatchInfo; won: boolean | null; me: number; them: number }[];
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

/** Fiches des adversaires rencontrés, du plus récent au plus ancien. */
export function opponentCards(s: State): OpponentCard[] {
  const byName = new Map<string, OpponentCard>();
  const list = [...s.debriefs].filter((d) => d.match?.opponent.trim()).sort((a, b) => b.date.localeCompare(a.date));
  for (const d of list) {
    const key = normName(d.match!.opponent);
    let c = byName.get(key);
    if (!c) { c = { name: d.match!.opponent.trim(), matches: [], wins: 0, losses: 0, issues: [], turning: [], lastKeep: '' }; byName.set(key, c); }
    const r = matchResult(d.match!.games);
    c.matches.push({ date: d.date, debrief: d, match: d.match!, ...r });
    if (r.won === true) c.wins++;
    if (r.won === false) c.losses++;
    if (!c.lastKeep && d.keep.trim()) c.lastKeep = d.keep.trim();
  }
  for (const c of byName.values()) {
    const issues: IssueKey[] = [];
    c.matches.forEach(({ debrief: d }) => new Set([...(d.issue ? [d.issue] : []), ...(d.detected || [])]).forEach((k) => issues.push(k)));
    c.issues = count(issues).map(([issue, n]) => ({ issue, n }));
    c.turning = count(c.matches.flatMap((m) => (m.match.turning ? [m.match.turning] : []))).map(([key, n]) => ({ key, n }));
  }
  return [...byName.values()];
}

export const findOpponent = (s: State, name: string) => {
  const k = normName(name);
  return k ? opponentCards(s).find((c) => normName(c.name) === k) : undefined;
};
