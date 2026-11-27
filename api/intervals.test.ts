import { describe, expect, it } from 'vitest';
import { handleIntervals, toWorkout } from './intervals';

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status });
const squash = { id: 'i123', start_date_local: '2026-11-27T12:30:00', type: 'Squash', elapsed_time: 3585, moving_time: 3300, average_heartrate: 148.4, max_heartrate: 176 };

describe('intervals.icu', () => {
  it('convertit une activité en séance', () => {
    expect(toWorkout(squash)).toMatchObject({ id: 'i-i123', date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3585, hrAvg: 148, hrMax: 176, source: 'intervals' });
  });
  it('prend le sport du profil quand Garmin envoie « Other », et garde l’effort noté sur la montre', () => {
    expect(toWorkout({ ...squash, type: 'Other', icu_rpe: 7 }, 'Squash')).toMatchObject({ sport: 'Squash', rpe: 7 });
  });
  it('appelle l’API avec la clé en authentification basique', async () => {
    let url = '', auth = '';
    const f = async (u: string, init?: RequestInit) => {
      url = u; auth = (init?.headers as Record<string, string>).Authorization;
      return json([squash, { id: 2, start_date_local: '2026-11-27T13:32:00', type: 'Squash', elapsed_time: 0 }]);
    };
    const r = await handleIntervals({ apiKey: 'abcdef123456', oldest: '2026-11-20' }, f, Date.UTC(2026, 10, 28));
    expect(url).toBe('https://intervals.icu/api/v1/athlete/0/activities?oldest=2026-11-20&newest=2026-11-30');
    expect(auth).toBe(`Basic ${btoa('API_KEY:abcdef123456')}`);
    expect(r.ok && r.workouts).toHaveLength(1); // l'activité sans durée est ignorée
  });
  it('refuse une clé mal formée sans appeler l’API, et signale une clé refusée', async () => {
    let called = false;
    expect(await handleIntervals({ apiKey: 'a b' }, async () => { called = true; return json([]); })).toMatchObject({ ok: false, status: 400 });
    expect(called).toBe(false);
    expect(await handleIntervals({ apiKey: 'abcdef123456' }, async () => json({}, 403))).toMatchObject({ ok: false, status: 401 });
  });
});
