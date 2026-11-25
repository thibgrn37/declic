import { describe, expect, it } from 'vitest';
import { adapt, buildWeek, initialLevels, priorities, scoreAssessment, suggestToday } from './engine';
import { freshState } from '../state/store';
import { addDays, mondayOf, todayKey } from '../state/dates';
import { ITEMS } from '../content/assessment';
import type { State } from '../state/types';

function setup(answer: (id: string) => number, perWeek: 3 | 4 | 5 = 4): State {
  const s = freshState();
  const answers = Object.fromEntries(ITEMS.map((i) => [i.id, answer(i.id)]));
  const a = scoreAssessment(answers);
  s.profile = { name: 'T', sport: 'tennis', sportType: 'precision', level: 'regional', minutes: 10, perWeek, experience: false, compName: '', compDate: '' };
  s.assessments = [a];
  s.levels = initialLevels(a, s.profile);
  return s;
}

describe('bilan', () => {
  it('inverse les items formulés négativement', () => {
    // Toujours « Tout à fait » : les items inversés tirent le score vers le bas.
    const a = scoreAssessment(Object.fromEntries(ITEMS.map((i) => [i.id, 5])));
    expect(a.scores.stress).toBe(67);
    expect(a.imagery).toBe(5);
  });
  it('fait commencer l’imagerie par l’éveil des sens quand les images sont floues', () => {
    const s = setup((id) => (id === 'i1' ? 2 : 3));
    expect(s.levels.imagerie).toBe(1);
  });
});

describe('programme', () => {
  it('respecte le nombre de séances choisi et cible le point le plus faible', () => {
    const s = setup((id) => (id.startsWith('s') ? (id === 's2' ? 5 : 1) : 4), 3);
    expect(priorities(s)[0].skill).toBe('stress');
    const w = buildWeek(s, mondayOf(todayKey()));
    expect(w.slots).toHaveLength(3);
    expect(w.slots.some((x) => x.techId === 'respiration')).toBe(true);
  });
  it('prend en compte un débrief récent', () => {
    const s = setup(() => 3);
    s.debriefs.push({ date: todayKey(), title: '', kind: 'competition', feel: 2, good: '', bad: 'x', keep: '', issue: 'pensees' });
    expect(priorities(s)[0].skill).toBe('dialogue');
  });
  it('propose une séance allégée quand le stress du jour est élevé', () => {
    const s = setup(() => 3);
    s.checkins[todayKey()] = { mood: 2, energy: 3, sleep: 3, stress: 5 };
    expect(suggestToday(s)?.source).toBe('allegee');
  });
  it('passe en protocole compétition à J-3', () => {
    const s = setup(() => 3);
    s.profile!.compDate = addDays(todayKey(), 3);
    expect(suggestToday(s)?.source).toBe('jourj');
  });
});

describe('adaptation', () => {
  it('monte de niveau après deux séances réussies et redescend après deux échecs', () => {
    const s = setup(() => 3);
    s.levels.imagerie = 2;
    const log = (rating: number, level: number) => s.sessions.push({ date: todayKey(), techId: 'imagerie', level, rating, useful: 3, note: '', source: 'plan' });
    log(4, 2); adapt(s, 'imagerie', 2, 4);
    expect(s.levels.imagerie).toBe(2);
    log(5, 2); adapt(s, 'imagerie', 2, 5);
    expect(s.levels.imagerie).toBe(3);
    log(2, 3); adapt(s, 'imagerie', 3, 2);
    log(1, 3); adapt(s, 'imagerie', 3, 1);
    expect(s.levels.imagerie).toBe(2);
  });
  it('passe directement au niveau suivant après une étape de mise en place', () => {
    const s = setup(() => 3);
    s.sessions.push({ date: todayKey(), techId: 'routine', level: 1, rating: 3, useful: 3, note: '', source: 'plan' });
    adapt(s, 'routine', 1, 3);
    expect(s.levels.routine).toBe(2);
  });
});
