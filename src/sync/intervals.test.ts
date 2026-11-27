import { describe, expect, it } from 'vitest';
import { absorb, importedSports, pruneUnfollowed } from './intervals';
import type { State, Workout } from '../state/types';

const w = (id: string, sport: string, source: Workout['source'] = 'intervals'): Workout =>
  ({ id, date: '2026-11-27', time: id === 'r' ? '08:00' : '12:30', sport, durationSec: 1800, source });
const state = (extra: Partial<State> = {}) =>
  ({ profile: { sport: 'squash' }, intervals: { apiKey: 'k', lastSync: 0 }, workouts: [], ...extra }) as unknown as State;

describe('filtre des sports importés', () => {
  it('ne garde que le squash par défaut et note les sports vus', () => {
    const s = state();
    expect(importedSports(s)).toEqual(['Squash']);
    const r = absorb(s, [w('s', 'Squash'), w('r', 'Course à pied')]);
    expect(r).toEqual({ added: 1, already: 0, skipped: 1 });
    expect(s.workouts!.map((x) => x.sport)).toEqual(['Squash']);
    expect(s.intervals!.seen).toEqual(['Course à pied', 'Squash']);
  });

  it('retire les séances importées d’un sport non suivi, pas les séances manuelles', () => {
    const s = state({ workouts: [w('s', 'Squash'), w('r', 'Course à pied'), w('m', 'Course à pied', 'manuel')] });
    expect(pruneUnfollowed(s)).toBe(1);
    expect(s.workouts!.map((x) => x.id)).toEqual(['s', 'm']);
  });

  it('respecte le choix de sports de l’utilisateur', () => {
    const s = state();
    s.intervals!.sports = ['Squash', 'Course à pied'];
    expect(absorb(s, [w('s', 'Squash'), w('r', 'Course à pied')]).skipped).toBe(0);
  });
});
