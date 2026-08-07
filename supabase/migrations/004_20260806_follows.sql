-- =====================================================================
-- Pocoloco — Sistem de following
--
-- Tabelul follows există deja în schemă la majoritatea instalărilor.
-- Migrarea e idempotentă: creează tabelul dacă lipsește și completează
-- constrângerile / indexurile / politicile care lipsesc.
--
-- Verifică întâi coloanele existente:
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'follows';
-- Aplicația se așteaptă la follower_id (cine urmărește) și
-- following_id (cine e urmărit).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Oprire clară dacă tabelul există cu alte nume de coloane
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'follows'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'follows' and column_name = 'follower_id'
  ) then
    raise exception 'public.follows există dar nu are coloana follower_id. Redenumește coloanele (alter table public.follows rename column ... to follower_id / following_id) și rulează din nou.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Tabelul
-- ---------------------------------------------------------------------
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

do $$
begin
  -- un singur follow per pereche
  if not exists (select 1 from pg_constraint where conname = 'follows_unique_pair') then
    alter table public.follows
      add constraint follows_unique_pair unique (follower_id, following_id);
  end if;
  -- nu te poți urmări pe tine
  if not exists (select 1 from pg_constraint where conname = 'follows_no_self') then
    alter table public.follows
      add constraint follows_no_self check (follower_id <> following_id);
  end if;
end $$;

create index if not exists follows_follower_idx  on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------
-- 2. RLS — oricine vede cine pe cine urmărește (contoare publice),
--    dar fiecare își gestionează doar propriile follow-uri
-- ---------------------------------------------------------------------
alter table public.follows enable row level security;

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows
  for select using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

drop policy if exists "follows_delete_admin" on public.follows;
create policy "follows_delete_admin" on public.follows
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Profilurile publice trebuie să fie vizibile ca să existe
--    /profile/[username]. Dacă ai deja o politică de citire publică pe
--    profiles, aceasta e redundantă (dar inofensivă).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'profiles' and rowsecurity
  ) then
    drop policy if exists "profiles_select_public" on public.profiles;
    create policy "profiles_select_public" on public.profiles
      for select using (true);
  end if;
end $$;
