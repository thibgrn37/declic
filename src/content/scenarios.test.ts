import { describe, expect, it } from 'vitest';
import { SQUASH_SCENARIOS, playsSquash, scenarioForTurning } from './scenarios';
import { matchScenario, suggestToday } from '../engine/engine';
import { freshState } from '../state/store';
import { addDays, todayKey } from '../state/dates';
import type { Debrief, State, TurningKey } from '../state/types';

function squashState(imageryLevel = 2): State {
  const s = freshState();
  s.profile = { name: 'T', sport: 'Squash', sportType: 'precision', level: 'regional', minutes: 10, perWeek: 4, experience: false, compName: '', compDate: '' };
  s.levels = { imagerie: imageryLevel };
  return s;
}

const matchDebrief = (date: string, turning: TurningKey): Debrief => ({
  date, title: 'Match', kind: 'competition', feel: 2, good: '', bad: '', keep: '', issue: '',
  match: { opponent: 'X', games: [[8, 11], [9, 11], [11, 7]], turning },
});

describe('scénarios squash', () => {
  it('relie chaque scénario à un moment clé du débrief', () => {
    expect(scenarioForTurning('mene')?.id).toBe('remontee');
    expect(scenarioForTurning('fin_jeu')?.id).toBe('balle-de-match');
    expect(scenarioForTurning('arbitre')?.id).toBe('let-refuse');
    expect(scenarioForTurning('physique')).toBeUndefined();
    for (const x of SQUASH_SCENARIOS) {
      const total = x.steps.reduce((n, st) => n + (st.kind === 'timed' ? st.sec : 0), 0);
      expect(Math.round(total / 60)).toBeLessThanOrEqual(x.min);
    }
  });
  it('ne s’affiche que pour un joueur de squash', () => {
    const s = squashState();
    expect(playsSquash(s)).toBe(true);
    s.profile!.sport = 'trail';
    expect(playsSquash(s)).toBe(false);
    s.workouts = [{ id: 'w', date: todayKey(), time: '', sport: 'Squash', durationSec: 3600, source: 'manuel' }];
    expect(playsSquash(s)).toBe(true);
  });
  it('propose le scénario du moment clé après un match', () => {
    const s = squashState();
    s.debriefs.push(matchDebrief(addDays(todayKey(), -1), 'arbitre'));
    const sug = suggestToday(s);
    expect(sug?.scenario).toBe('let-refuse');
    expect(sug?.techId).toBe('imagerie');
  });
  it('ne le repropose pas une fois joué, ni trop tard, ni avant le niveau 2', () => {
    const s = squashState();
    const d = addDays(todayKey(), -1);
    s.debriefs.push(matchDebrief(d, 'mene'));
    s.sessions.push({ date: d, techId: 'imagerie', level: 2, rating: 4, useful: 4, note: '', source: 'libre', scenario: 'remontee' });
    expect(matchScenario(s)).toBeUndefined();
    const old = squashState();
    old.debriefs.push(matchDebrief(addDays(todayKey(), -5), 'mene'));
    expect(matchScenario(old)).toBeUndefined();
    const beginner = squashState(1);
    beginner.debriefs.push(matchDebrief(todayKey(), 'mene'));
    expect(matchScenario(beginner)).toBeUndefined();
  });
});
