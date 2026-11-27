import { describe, expect, it } from 'vitest';
import { handleStrava, toWorkout } from './strava';

const env = { clientId: '123', clientSecret: 'secret' };
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status });
const squash = { id: 99, sport_type: 'Squash', name: 'Squash', start_date_local: '2026-11-27T12:30:00Z', elapsed_time: 3585, moving_time: 3300, average_heartrate: 148.4, max_heartrate: 176 };

describe('Strava', () => {
  it('convertit une activité en séance', () => {
    expect(toWorkout(squash)).toMatchObject({ id: 's-99', date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3585, hrAvg: 148, hrMax: 176, source: 'strava' });
  });
  it('donne l’identifiant seulement si le serveur est configuré', async () => {
    expect(await handleStrava('GET', null, env)).toEqual({ ok: true, clientId: '123' });
    expect(await handleStrava('GET', null, {})).toEqual({ ok: true, clientId: null });
  });
  it('échange le code puis lit les activités, sans exposer le secret', async () => {
    const calls: string[] = [];
    const f = async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.includes('oauth/token')) {
        expect(String(init?.body)).toContain('grant_type=authorization_code');
        return json({ access_token: 'A', refresh_token: 'R', athlete: { firstname: 'Thibaut' } });
      }
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer A');
      return json([squash]);
    };
    const r = await handleStrava('POST', { action: 'exchange', code: 'c' }, env, f, Date.UTC(2026, 10, 28));
    expect(r).toMatchObject({ ok: true, refreshToken: 'R', athlete: 'Thibaut' });
    expect(JSON.stringify(r)).not.toContain('secret');
    expect('workouts' in r && r.workouts[0].sport).toBe('Squash');
    expect(calls).toHaveLength(2);
  });
  it('signale un jeton révoqué', async () => {
    const r = await handleStrava('POST', { action: 'activities', refreshToken: 'x' }, env, async () => json({}, 401));
    expect(r).toMatchObject({ ok: false, status: 401 });
  });
});
