// Fonction Vercel : liaison avec Strava (voir src/server/strava.ts).
// Variables d'environnement à définir dans Vercel : STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET.
import { handleStrava } from '../src/server/strava';

declare const process: { env: Record<string, string | undefined> };

const env = () => ({ clientId: process.env.STRAVA_CLIENT_ID, clientSecret: process.env.STRAVA_CLIENT_SECRET });
const reply = (r: Awaited<ReturnType<typeof handleStrava>>) =>
  new Response(JSON.stringify(r), { status: r.ok ? 200 : r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET() {
  return reply(await handleStrava('GET', null, env()));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return reply(await handleStrava('POST', body, env()));
}
