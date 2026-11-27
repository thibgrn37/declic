import { describe, expect, it } from 'vitest';
import { mergeWorkouts, parseDuration, parseGarminCsv, sessionLoad, trainingInsights, weeklyTraining } from './training';
import { initialLevels, priorities, scoreAssessment, suggestToday } from './engine';
import { pendingDebriefs } from './training';
import { freshState } from '../state/store';
import { addDays, todayKey } from '../state/dates';
import { ITEMS } from '../content/assessment';
import type { Workout } from '../state/types';

const squash = (over: Partial<Workout> = {}): Workout => ({
  id: Math.random().toString(36), date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3585, hrAvg: 148, hrMax: 176, source: 'manuel', ...over,
});

describe('durées et charge', () => {
  it('lit les formats de durée courants', () => {
    expect(parseDuration('59:45')).toBe(3585);
    expect(parseDuration('15:26')).toBe(926);
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('45')).toBe(2700);
    expect(parseDuration('1h30')).toBe(5400);
    expect(parseDuration('')).toBe(0);
  });
  it('calcule la charge session-RPE seulement si l’effort est noté', () => {
    expect(sessionLoad(squash())).toBeNull();
    expect(sessionLoad(squash({ rpe: 7 }))).toBe(Math.round(7 * 3585 / 60));
  });
  it('additionne les minutes par semaine', () => {
    const t = todayKey();
    const w = weeklyTraining([squash({ date: t }), squash({ date: t, durationSec: 926 })], 8, t);
    expect(w[7].minutes).toBe(75);
    expect(w[7].count).toBe(2);
  });
});

describe('import Garmin', () => {
  it('lit l’export CSV anglais', () => {
    const csv = 'Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR\n'
      + '"Squash","2026-11-27 13:32:00","false","Squash","0.00","210","00:15:26","147","169"\n'
      + '"Squash","2026-11-27 12:30:00","false","Squash","0.00","780","00:59:45.2","148","176"\n';
    const w = parseGarminCsv(csv);
    expect(w).toHaveLength(2);
    expect(w[1]).toMatchObject({ date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3585, hrAvg: 148, hrMax: 176, source: 'garmin' });
  });
  it('lit l’export CSV français avec point-virgule', () => {
    const csv = 'Type d\'activité;Date;Titre;Durée;Fréquence cardiaque moyenne;Fréquence cardiaque maximale\n'
      + 'Course à pied;27/11/2026 07:05;Footing;00:40:00;141;160\n';
    expect(parseGarminCsv(csv)[0]).toMatchObject({ date: '2026-11-27', time: '07:05', sport: 'Course à pied', durationSec: 2400, hrAvg: 141, hrMax: 160 });
  });
  it('n’importe pas deux fois la même séance', () => {
    const a = squash();
    const r = mergeWorkouts([a], [{ ...a, id: 'x', source: 'garmin' }, squash({ time: '13:32', durationSec: 926 })]);
    expect(r.added).toBe(1);
    expect(r.list).toHaveLength(2);
  });
});

describe('lien avec le mental', () => {
  function setup() {
    const s = freshState();
    const a = scoreAssessment(Object.fromEntries(ITEMS.map((i) => [i.id, 3])));
    s.profile = { name: 'T', sport: 'Squash', sportType: 'precision', level: 'regional', minutes: 10, perWeek: 4, experience: false, compName: '', compDate: '' };
    s.assessments = [a];
    s.levels = initialLevels(a, s.profile);
    return s;
  }
  it('propose une séance allégée après une séance très dure', () => {
    const s = setup();
    const t = todayKey();
    expect(suggestToday(s, t)?.source).toBe('plan');
    s.workouts = [squash({ date: addDays(t, -1), rpe: 9 })];
    const sug = suggestToday(s, t)!;
    expect(sug.source).toBe('allegee');
    expect(sug.reason).toContain('Grosse séance hier');
  });
  it('compare la concentration avec et sans séance Déclic', () => {
    const s = setup();
    const t = todayKey();
    s.workouts = [];
    for (let i = 1; i <= 6; i++) {
      const date = addDays(t, -i * 2);
      const prep = i % 2 === 0;
      if (prep) s.sessions.push({ date, techId: 'respiration', level: 1, rating: 4, useful: 4, note: '', source: 'plan' });
      s.workouts.push(squash({ date, focus: prep ? 4 : 2 }));
    }
    const ins = trainingInsights(s, t);
    expect(ins[0].text).toContain('4,0/5');
    expect(ins[0].tone).toBe('plus');
  });
  it('liste les séances à débriefer puis les retire une fois notées', () => {
    const s = setup();
    const t = todayKey();
    s.workouts = [squash({ date: t }), squash({ date: addDays(t, -10) })];
    expect(pendingDebriefs(s, t)).toHaveLength(1);
    s.workouts[0].rpe = 7; // effort venu de la montre : le débrief reste proposé
    expect(pendingDebriefs(s, t)).toHaveLength(1);
    s.workouts[0].debriefed = true;
    expect(pendingDebriefs(s, t)).toHaveLength(0);
  });
  it('le petit débrief oriente la séance suivante et les priorités', () => {
    const s = setup();
    const t = todayKey();
    const before = priorities(s, t).find((p) => p.skill === 'stress')!.score;
    s.workouts = [squash({ date: addDays(t, -1), rpe: 6, issue: 'stress' })];
    expect(priorities(s, t).find((p) => p.skill === 'stress')!.score).toBe(before - 8);
    const sug = suggestToday(s, t)!;
    expect(sug.techId).toBe('respiration');
    expect(sug.reason).toContain('stress');
    // Une fois la séance ciblée faite, le plan reprend.
    s.sessions.push({ date: t, techId: 'respiration', level: 1, rating: 4, useful: 4, note: '', source: 'libre' });
    expect(suggestToday(s, t)?.source).toBe('plan');
  });
});
