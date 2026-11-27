import { describe, expect, it } from 'vitest';
import { mergeSquashnet, parseSquashnet, rankHistory } from './squashnet';
import { findOpponent, opponentCards } from './opponents';
import { freshState } from '../state/store';

// Copie de la page « Mes matchs » (noms fictifs), en-tête et texte autour compris.
const PAGE = [
  'Mon classement',
  '3A-343-358',
  '#\t\tClt\tDate\tTournoi\tAdversaire\tScore',
  '1\t\tNC-5207\t19-10-2019\tCHAMPIONNAT PAR EQUIPES - LIGUE CENTRE 2019/2020\tDURAND PAUL - 5A - 2575\t12-14 2-11 3-11',
  '2\t\t3A-353\t12-01-2026\tchallenge 37 session 1\tMARTIN LUC - 3B - 460\t7-11 11-7 5-11 4-11',
  '3\t\t3A-357\t16-01-2026\tQualif 3e serie\tMARTIN LUC - 3B - 489\t11-04 08-11 11-05 11-05',
  '4\t\t3A-357\t23-01-2026\tchallenge 37 session 2\tPETIT JEAN - 3D - 772\t00-11 00-11 00-11 WO',
  '5\t\t3A-343\t15-11-2026\tChampionnat\tBERNARD ALAIN - 3A - 300\t11-5 5-11 14-16 11-8 5-4 Ab',
].join('\n');

describe('import Squashnet', () => {
  it('lit les matchs et ignore le reste de la page', () => {
    const l = parseSquashnet(PAGE);
    expect(l).toHaveLength(5);
    expect(l[0]).toEqual({
      date: '2019-10-19', event: 'CHAMPIONNAT PAR EQUIPES - LIGUE CENTRE 2019/2020', opponent: 'DURAND PAUL',
      oppClass: '5A', oppRank: 2575, myClass: 'NC', myRank: 5207, games: [[12, 14], [2, 11], [3, 11]],
    });
    expect(l[2].games).toEqual([[11, 4], [8, 11], [11, 5], [11, 5]]);
    expect(l[3].special).toBe('WO');
    expect(l[4].special).toBe('Ab');
  });
  it('n’ajoute pas deux fois le même match', () => {
    const l = parseSquashnet(PAGE);
    const a = mergeSquashnet([], l);
    expect(a.added).toBe(5);
    expect(mergeSquashnet(a.list, parseSquashnet(PAGE)).added).toBe(0);
  });
  it('trace le rang et alimente les fiches adversaires', () => {
    const s = freshState();
    s.squashnet = { matches: parseSquashnet(PAGE), importedAt: '2026-11-27' };
    expect(rankHistory(s.squashnet.matches).map((x) => x.rank)).toEqual([5207, 353, 357, 357, 343]);
    // Un débrief du même jour, nom saisi dans l'autre ordre, complète le match officiel.
    s.debriefs = [{ date: '2026-01-12', title: '', kind: 'competition', feel: 2, good: '', bad: '', keep: 'Jouer long', issue: 'stress', match: { opponent: 'Luc Martin', games: [], turning: 'mene' } }];
    const c = findOpponent(s, 'luc martin')!;
    expect(c.name).toBe('MARTIN LUC');
    expect(c.cls).toBe('3B');
    expect(c.matches).toHaveLength(2);
    expect([c.wins, c.losses]).toEqual([1, 1]);
    expect(c.lastKeep).toBe('Jouer long');
    expect(c.turning[0].key).toBe('mene');
    // WO et abandon ne comptent ni en victoire ni en défaite.
    const p = opponentCards(s).find((x) => x.name === 'PETIT JEAN')!;
    expect([p.wins, p.losses]).toEqual([0, 0]);
  });
});
