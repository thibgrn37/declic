// Fonction Vercel : relais vers l'API intervals.icu (voir src/server/intervals.ts).
// Aucune variable d'environnement : chaque utilisateur fournit sa propre clé, qui n'est pas conservée ici.
import { handleIntervals } from '../src/server/intervals';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const r = await handleIntervals(body);
  return new Response(JSON.stringify(r), {
    status: r.ok ? 200 : r.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
