-- Déclic : sauvegarde en ligne des données de l'utilisateur.
-- À coller une fois dans Supabase > SQL Editor > New query, puis « Run ».
--
-- Une ligne par utilisateur : tout l'état de l'appli dans une colonne JSON.
-- saved_at est l'heure (en millisecondes) de la dernière modification faite
-- sur l'appareil, ce qui permet de garder la version la plus récente.

create table if not exists public.declic_state (
  user_id  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  state    jsonb  not null,
  saved_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.declic_state enable row level security;

-- Chacun ne voit et ne modifie que sa propre ligne.
drop policy if exists "lecture de ses données" on public.declic_state;
create policy "lecture de ses données" on public.declic_state
  for select using (auth.uid() = user_id);

drop policy if exists "création de ses données" on public.declic_state;
create policy "création de ses données" on public.declic_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "modification de ses données" on public.declic_state;
create policy "modification de ses données" on public.declic_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "suppression de ses données" on public.declic_state;
create policy "suppression de ses données" on public.declic_state
  for delete using (auth.uid() = user_id);

-- Droits d'accès via l'API (les projets Supabase récents ne les donnent plus
-- automatiquement aux nouvelles tables). Les règles ci-dessus limitent quand même
-- chaque utilisateur à sa propre ligne.
grant select, insert, update, delete on public.declic_state to authenticated;
revoke all on public.declic_state from anon;

-- Prise en compte immédiate par l'API.
notify pgrst, 'reload schema';
