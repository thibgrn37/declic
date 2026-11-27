import { describe, expect, it } from 'vitest';
import { findOpponent, matchResult, normName, opponentCards, parseScore } from './opponents';
import { freshState } from '../state/store';
import type { Debrief } from '../state/types';

const deb = (date: string, opponent: string, score: string, extra: Partial<Debrief> = {}): Debrief => ({
  date, title: '', kind: 'competition', feel: 3, good: '', bad: '', keep: '', issue: '',
  match: { opponent, games: parseScore(score) }, ...extra,
});

describe('score et adversaires', () => {
  it('lit un score jeu par jeu', () => {
    expect(parseScore('11-7 9-11 11/5, 12–10')).toEqual([[11, 7], [9, 11], [11, 5], [12, 10]]);
    expect(matchResult(parseScore('11-7 9-11 11-5 12-10'))).toEqual({ me: 3, them: 1, won: true });
    expect(matchResult([]).won).toBeNull();
  });
  it('reconnaît un adversaire malgré la casse et les accents', () => {
    expect(normName('  Lefèvre   julien ')).toBe('LEFEVRE JULIEN');
  });
  it('regroupe les matchs par adversaire avec bilan et obstacles', () => {
    const s = freshState();
    s.debriefs = [
      deb('2026-10-01', 'Lefèvre Julien', '8-11 11-9 7-11 5-11', { issue: 'stress', keep: 'Rester devant le T', match: { opponent: 'Lefèvre Julien', games: parseScore('8-11 11-9 7-11 5-11'), turning: 'fin_jeu' } }),
      deb('2026-11-10', 'LEFEVRE JULIEN', '11-8 11-9 11-6', { detected: ['stress', 'attention'] }),
      deb('2026-11-12', 'Martin Paul', '11-3 11-4 11-2'),
    ];
    const cards = opponentCards(s);
    expect(cards.map((c) => c.name)).toEqual(['Martin Paul', 'LEFEVRE JULIEN']);
    const j = findOpponent(s, 'lefevre julien')!;
    expect([j.wins, j.losses]).toEqual([1, 1]);
    expect(j.issues[0]).toEqual({ issue: 'stress', n: 2 });
    expect(j.turning[0]).toEqual({ key: 'fin_jeu', n: 1 });
    expect(j.lastKeep).toBe('Rester devant le T');
  });
});
