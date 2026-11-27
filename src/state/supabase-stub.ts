// Remplace @supabase/supabase-js dans le build artifact (où la sauvegarde en ligne est inactive),
// pour ne pas alourdir le fichier unique.
export function createClient(): never {
  throw new Error('Supabase indisponible dans cette version');
}
