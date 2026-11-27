// Fonction Vercel : relais vers l'API intervals.icu.
// intervals.icu reçoit automatiquement les activités de Garmin Connect et offre une API gratuite
// avec une clé personnelle. Le serveur ne sert que de relais : il ne garde rien.
// Fichier autonome, sans import de code : sous Vercel, le projet est en modules ES et un import
// relatif sans extension (« ../src/... ») échoue à l'exécution.
import type { Workout } from '../src/state/types';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface IcuActivity {
  id: string | number;
  start_date_local?: string; // « 2026-11-27T12:30:00 »
  type?: string;
  name?: string;
  elapsed_time?: number;
  moving_time?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  icu_rpe?: number; // effort perçu 1 à 10, s'il a été noté sur la montre ou dans intervals.icu
}

const SPORTS: Record<string, string> = {
  Squash: 'Squash', Tennis: 'Tennis', Padel: 'Padel', Pickleball: 'Pickleball', Badminton: 'Badminton', Racquetball: 'Racquetball',
  TableTennis: 'Tennis de table', Run: 'Course à pied', TrailRun: 'Trail', VirtualRun: 'Course à pied', Ride: 'Vélo', VirtualRide: 'Vélo',
  MountainBikeRide: 'VTT', GravelRide: 'Vélo', Swim: 'Natation', OpenWaterSwim: 'Natation', Walk: 'Marche', Hike: 'Randonnée',
  WeightTraining: 'Musculation', Workout: 'Entraînement', Crossfit: 'CrossFit', HighIntensityIntervalTraining: 'HIIT', Yoga: 'Yoga',
  Pilates: 'Pilates', Rowing: 'Aviron', Soccer: 'Football', Basketball: 'Basket', Volleyball: 'Volley', Elliptical: 'Elliptique',
};

export function toWorkout(a: IcuActivity, fallbackSport = 'Entraînement'): Workout | null {
  const local = a.start_date_local || '';
  const durationSec = Math.round(a.elapsed_time || a.moving_time || 0);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local) || !durationSec) return null;
  const sport = (a.type && SPORTS[a.type]) || (a.type && a.type !== 'Other' ? a.type : '') || fallbackSport;
  const rpe = a.icu_rpe && a.icu_rpe >= 1 && a.icu_rpe <= 10 ? Math.round(a.icu_rpe) : undefined;
  return {
    id: `i-${a.id}`, date: local.slice(0, 10), time: local.slice(11, 16), sport, durationSec,
    hrAvg: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    hrMax: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    rpe, source: 'intervals',
  };
}

export type IcuReply = { ok: true; workouts: Workout[] } | { ok: false; error: string; status: number };

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Lit les activités de la clé donnée entre `oldest` (AAAA-MM-JJ) et demain. */
export async function handleIntervals(body: unknown, f: FetchFn = fetch, now = Date.now()): Promise<IcuReply> {
  const b = (body || {}) as { apiKey?: unknown; oldest?: unknown; sport?: unknown };
  const key = typeof b.apiKey === 'string' ? b.apiKey.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) return { ok: false, error: 'Clé API invalide', status: 400 };
  const minOldest = isoDay(now - 180 * 86400e3);
  const wanted = typeof b.oldest === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.oldest) ? b.oldest : isoDay(now - 30 * 86400e3);
  const oldest = wanted < minOldest ? minOldest : wanted;
  const newest = isoDay(now + 2 * 86400e3); // marge pour le décalage horaire : la séance du jour est toujours incluse
  try {
    const r = await f(`https://intervals.icu/api/v1/athlete/0/activities?oldest=${oldest}&newest=${newest}`, {
      headers: {
        Authorization: `Basic ${btoa(`API_KEY:${key}`)}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Declic/1.0)',
      },
    });
    if (r.status === 401 || r.status === 403) return { ok: false, error: 'intervals.icu refuse la clé : vérifie-la ou régénère-la.', status: 401 };
    if (r.status === 429) return { ok: false, error: 'intervals.icu demande de patienter un peu.', status: 429 };
    if (!r.ok) return { ok: false, error: 'intervals.icu ne répond pas pour le moment.', status: 502 };
    const list = (await r.json()) as IcuActivity[];
    const fallback = typeof b.sport === 'string' && b.sport ? b.sport : undefined;
    return { ok: true, workouts: (Array.isArray(list) ? list : []).map((a) => toWorkout(a, fallback)).filter((w): w is Workout => w !== null) };
  } catch (e) {
    return { ok: false, error: `Le relais n’a pas pu joindre intervals.icu (${(e as Error).message || 'erreur réseau'}).`, status: 502 };
  }
}

const json = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Point d'entrée Vercel. GET sert à vérifier que le relais est en ligne. */
export function GET() {
  return json({ ok: true, relay: 'intervals.icu' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const r = await handleIntervals(body);
  return json(r, r.ok ? 200 : r.status);
}
