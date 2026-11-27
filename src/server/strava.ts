// Liaison Strava, côté serveur (fonction Vercel api/strava.ts).
// Le secret de l'appli Strava reste sur le serveur ; l'appli ne garde que le jeton de rafraîchissement.
// Garmin Connect envoie automatiquement chaque activité vers Strava : on les récupère ici.
import type { Workout } from '../state/types';

export interface StravaEnv { clientId?: string; clientSecret?: string }
type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface StravaActivity {
  id: number;
  sport_type?: string;
  type?: string;
  name?: string;
  start_date_local: string; // heure locale écrite avec un Z : « 2026-11-27T12:30:00Z »
  elapsed_time: number;
  moving_time?: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

const SPORTS: Record<string, string> = {
  Squash: 'Squash', Tennis: 'Tennis', Padel: 'Padel', Pickleball: 'Pickleball', Badminton: 'Badminton', Racquetball: 'Racquetball',
  TableTennis: 'Tennis de table', Run: 'Course à pied', TrailRun: 'Trail', VirtualRun: 'Course à pied', Ride: 'Vélo', VirtualRide: 'Vélo',
  MountainBikeRide: 'VTT', GravelRide: 'Vélo', Swim: 'Natation', Walk: 'Marche', Hike: 'Randonnée', WeightTraining: 'Musculation',
  Workout: 'Entraînement', Crossfit: 'CrossFit', HighIntensityIntervalTraining: 'HIIT', Yoga: 'Yoga', Pilates: 'Pilates', Rowing: 'Aviron',
  Soccer: 'Football', Basketball: 'Basket', Volleyball: 'Volley', Elliptical: 'Elliptique', StairStepper: 'Stepper',
};

export function toWorkout(a: StravaActivity): Workout {
  const local = a.start_date_local;
  const key = a.sport_type || a.type || '';
  return {
    id: `s-${a.id}`,
    date: local.slice(0, 10),
    time: local.slice(11, 16),
    sport: SPORTS[key] || a.name || 'Entraînement',
    durationSec: a.elapsed_time || a.moving_time || 0,
    hrAvg: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    hrMax: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    source: 'strava',
  };
}

type Body =
  | { action: 'exchange'; code: string }
  | { action: 'activities'; refreshToken: string; after?: number };

export type StravaReply =
  | { ok: true; clientId: string | null }
  | { ok: true; refreshToken: string; athlete: string; workouts: Workout[] }
  | { ok: false; error: string; status: number };

async function token(env: StravaEnv, f: FetchFn, params: Record<string, string>) {
  const r = await f('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.clientId!, client_secret: env.clientSecret!, ...params }).toString(),
  });
  if (!r.ok) throw Object.assign(new Error('Strava a refusé la connexion'), { status: r.status === 400 || r.status === 401 ? 401 : 502 });
  return r.json() as Promise<{ access_token: string; refresh_token: string; athlete?: { firstname?: string } }>;
}

async function activities(f: FetchFn, access: string, after: number) {
  const out: StravaActivity[] = [];
  for (let page = 1; page <= 4; page++) {
    const r = await f(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50&page=${page}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!r.ok) throw Object.assign(new Error('Lecture des activités Strava impossible'), { status: r.status === 401 ? 401 : 502 });
    const list = (await r.json()) as StravaActivity[];
    out.push(...list);
    if (list.length < 50) break;
  }
  return out;
}

/** Traite une requête de l'appli. GET : configuration ; POST : échange du code ou lecture des activités. */
export async function handleStrava(method: string, body: unknown, env: StravaEnv, f: FetchFn = fetch, now = Date.now()): Promise<StravaReply> {
  const configured = Boolean(env.clientId && env.clientSecret);
  if (method === 'GET') return { ok: true, clientId: configured ? env.clientId! : null };
  if (!configured) return { ok: false, error: 'Strava n’est pas configuré sur le serveur', status: 503 };
  const b = (body || {}) as Body;
  try {
    let access: string, refresh: string, athlete = '';
    if (b.action === 'exchange' && typeof b.code === 'string') {
      const t = await token(env, f, { code: b.code, grant_type: 'authorization_code' });
      access = t.access_token; refresh = t.refresh_token; athlete = t.athlete?.firstname || '';
    } else if (b.action === 'activities' && typeof b.refreshToken === 'string') {
      const t = await token(env, f, { refresh_token: b.refreshToken, grant_type: 'refresh_token' });
      access = t.access_token; refresh = t.refresh_token;
    } else {
      return { ok: false, error: 'requête invalide', status: 400 };
    }
    // Par défaut, les 30 derniers jours ; jamais plus de 180 jours.
    const minAfter = Math.floor(now / 1000) - 180 * 86400;
    const after = Math.max(minAfter, b.action === 'activities' && b.after ? b.after : Math.floor(now / 1000) - 30 * 86400);
    const list = await activities(f, access, after);
    return { ok: true, refreshToken: refresh, athlete, workouts: list.filter((a) => a.elapsed_time > 0).map(toWorkout) };
  } catch (e) {
    return { ok: false, error: (e as Error).message, status: (e as { status?: number }).status || 502 };
  }
}
