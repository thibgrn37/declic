/* Sauvegarde en ligne avec Supabase (version hébergée de l'appli).
 * Actif seulement si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies au build.
 * Sans elles (build artifact, développement local), ce module ne charge rien. */
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = 'declic_state';

export const cloudConfigured = Boolean(URL && KEY);

let clientP: Promise<SupabaseClient> | null = null;
function client(): Promise<SupabaseClient> {
  if (!cloudConfigured) return Promise.reject(new Error('sauvegarde en ligne non configurée'));
  clientP ??= import('@supabase/supabase-js').then((m) =>
    m.createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  );
  return clientP;
}

export type Account = { id: string; email: string };

export async function currentAccount(): Promise<Account | null> {
  if (!cloudConfigured) return null;
  const sb = await client();
  const { data } = await sb.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

export async function onAccountChange(cb: (a: Account | null) => void): Promise<() => void> {
  if (!cloudConfigured) return () => {};
  const sb = await client();
  const { data } = sb.auth.onAuthStateChange((_e, session) => {
    const u = session?.user;
    cb(u ? { id: u.id, email: u.email ?? '' } : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Messages d'erreur Supabase les plus courants, en français. */
function fr(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Confirme d’abord ton adresse avec le lien reçu par e-mail.';
  if (/already registered/i.test(msg)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.';
  if (/password should be at least/i.test(msg)) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (/signups not allowed/i.test(msg)) return 'La création de comptes est fermée sur ce site.';
  if (/failed to fetch|network/i.test(msg)) return 'Pas de connexion internet.';
  return msg;
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = await client();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(fr(error.message));
}

/** Renvoie true si un e-mail de confirmation a été envoyé (session pas encore ouverte). */
export async function signUp(email: string, password: string): Promise<boolean> {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
  if (error) throw new Error(fr(error.message));
  return !data.session;
}

export async function signOut(): Promise<void> {
  const sb = await client();
  await sb.auth.signOut();
}

export async function loadRemote(): Promise<{ state: unknown; at: number } | null> {
  const sb = await client();
  const { data, error } = await sb.from(TABLE).select('state, saved_at').maybeSingle();
  if (error) throw error;
  return data ? { state: data.state, at: Number(data.saved_at) } : null;
}

export async function saveRemote(userId: string, state: unknown, at: number): Promise<void> {
  const sb = await client();
  const { error } = await sb.from(TABLE).upsert({ user_id: userId, state, saved_at: at, updated_at: new Date().toISOString() });
  if (error) throw error;
}
