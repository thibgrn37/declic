import type { SquashnetMatch } from '../state/types';
import { parseScore } from './opponents';

// Lecture du tableau « Mon classement > Mes matchs » de squashnet.fr, copié-collé.
// Une ligne par match, cellules séparées par des tabulations :
// #  (icône)  Clt  Date  Tournoi  Adversaire  Score
// 1		3A-353	12-01-2026	challenge 37 session 1	PILLOT ANTOINE - 3B - 460	7-11 11-7 5-11 4-11
// Le score est donné de ton point de vue. Les lignes qui ne ressemblent pas à un match sont ignorées,
// on peut donc coller toute la page.

const CLT = /^(NC|\d[A-DIN])\s*-\s*(\d+)$/;
const DATE = /^(\d{2})-(\d{2})-(\d{4})$/;
const OPP = /^(.+?)\s+-\s+(NC|\d[A-DIN])\s+-\s+(\d+)$/;

export function parseSquashnet(text: string): SquashnetMatch[] {
  const out: SquashnetMatch[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
    const di = cells.findIndex((c) => DATE.test(c));
    if (di < 1 || cells.length < di + 4) continue;
    const clt = cells[di - 1].match(CLT);
    const opp = cells[cells.length - 2].match(OPP);
    const scoreText = cells[cells.length - 1];
    if (!clt || !opp) continue;
    const [, dd, mm, yy] = cells[di].match(DATE)!;
    const special = /\bWO\b/i.test(scoreText) ? 'WO' : /\bAb\b/.test(scoreText) ? 'Ab' : undefined;
    out.push({
      date: `${yy}-${mm}-${dd}`,
      event: cells.slice(di + 1, cells.length - 2).join(' '),
      opponent: opp[1].trim(),
      oppClass: opp[2],
      oppRank: +opp[3],
      myClass: clt[1],
      myRank: +clt[2],
      games: parseScore(scoreText),
      ...(special ? { special } : {}),
    });
  }
  return out;
}

const key = (m: SquashnetMatch) => `${m.date}|${m.opponent.toUpperCase()}|${m.games.map((g) => g.join('-')).join(' ')}`;

/** Ajoute les nouveaux matchs sans doublon, du plus ancien au plus récent. */
export function mergeSquashnet(existing: SquashnetMatch[], incoming: SquashnetMatch[]) {
  const seen = new Set(existing.map(key));
  const fresh = incoming.filter((m) => { const k = key(m); if (seen.has(k)) return false; seen.add(k); return true; });
  const list = [...existing, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
  return { list, added: fresh.length };
}

/** Ton rang au fil du temps (un point par date de match). */
export function rankHistory(list: SquashnetMatch[]) {
  const byDate = new Map<string, { date: string; rank: number; cls: string }>();
  for (const m of list) byDate.set(m.date, { date: m.date, rank: m.myRank, cls: m.myClass });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
