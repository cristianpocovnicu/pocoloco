-- =====================================================================
-- Pocoloco — Călătorii: itinerar, salvare, moderare
-- Rulează DUPĂ 20260806_admin_dashboard.sql (are nevoie de is_admin()).
-- Rulează întâi supabase/checks/inspect_trips.sql.
--
-- Migrarea e idempotentă și aditivă: completează ce lipsește din
-- trip_locations și saves, fără să șteargă sau să redenumească nimic.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Oprire clară dacă trip_locations există cu alte nume de coloane
-- ---------------------------------------------------------------------
do $$
declare
  lipsa text[] := '{}';
  col   text;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'trip_locations'
  ) then
    foreach col in array array['trip_id', 'location_id'] loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'trip_locations' and column_name = col
      ) then
        lipsa := lipsa || col;
      end if;
    end loop;

    if array_length(lipsa, 1) > 0 then
      raise exception 'public.trip_locations există dar îi lipsesc coloanele: %. Redenumește-le și rulează din nou.', array_to_string(lipsa, ', ');
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. trips — valori implicite
-- ---------------------------------------------------------------------
update public.trips set status     = 'active' where status is null;
update public.trips set save_count = 0        where save_count is null;

alter table public.trips alter column status     set default 'active';
alter table public.trips alter column save_count set default 0;

create index if not exists trips_status_idx     on public.trips (status);
create index if not exists trips_save_count_idx on public.trips (save_count desc);
create index if not exists trips_author_idx     on public.trips (author_id);

-- ---------------------------------------------------------------------
-- 2. trip_locations — itinerarul
-- ---------------------------------------------------------------------
create table if not exists public.trip_locations (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  day         integer not null default 1,
  note        text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- coloanele pe care le folosește aplicația, pentru instalările mai vechi
alter table public.trip_locations add column if not exists day        integer not null default 1;
alter table public.trip_locations add column if not exists note       text;
alter table public.trip_locations add column if not exists position   integer not null default 0;
alter table public.trip_locations add column if not exists created_at timestamptz not null default now();

create index if not exists trip_locations_trip_idx on public.trip_locations (trip_id, day, position);

-- ---------------------------------------------------------------------
-- 3. saves — până acum salva doar locații
-- ---------------------------------------------------------------------
alter table public.saves add column if not exists trip_id uuid references public.trips (id) on delete cascade;

-- o salvare e ori de locație, ori de călătorie => location_id devine opțional
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'saves'
      and column_name = 'location_id' and is_nullable = 'NO'
  ) then
    alter table public.saves alter column location_id drop not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'saves_target_check') then
    alter table public.saves
      add constraint saves_target_check check (location_id is not null or trip_id is not null);
  end if;
end $$;

-- o singură salvare per user și țintă (ignoră dacă ai deja duplicate)
do $$
begin
  create unique index if not exists saves_user_location_idx
    on public.saves (user_id, location_id) where location_id is not null;
exception when others then
  raise notice 'Indexul saves_user_location_idx nu a putut fi creat (probabil ai duplicate): %', sqlerrm;
end $$;

do $$
begin
  create unique index if not exists saves_user_trip_idx
    on public.saves (user_id, trip_id) where trip_id is not null;
exception when others then
  raise notice 'Indexul saves_user_trip_idx nu a putut fi creat (probabil ai duplicate): %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 4. Trigger pentru trips.save_count
--    security definer: salvezi călătoriile altora, deci n-ai drept de
--    update pe ele sub RLS
-- ---------------------------------------------------------------------
create or replace function public.sync_trip_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.trip_id is not null then
      update public.trips set save_count = coalesce(save_count, 0) + 1 where id = new.trip_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.trip_id is not null then
      update public.trips
        set save_count = greatest(coalesce(save_count, 0) - 1, 0)
        where id = old.trip_id;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists saves_sync_trip_count_trg on public.saves;
create trigger saves_sync_trip_count_trg
  after insert or delete on public.saves
  for each row execute function public.sync_trip_save_count();

-- contoarele la zi
update public.trips t
  set save_count = (select count(*) from public.saves s where s.trip_id = t.id);

-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
alter table public.trips enable row level security;

drop policy if exists "trips_select_visible" on public.trips;
create policy "trips_select_visible" on public.trips
  for select using (
    status = 'active' or author_id = auth.uid() or public.is_admin()
  );

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "trips_update_own_or_admin" on public.trips;
create policy "trips_update_own_or_admin" on public.trips
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "trips_delete_own_or_admin" on public.trips;
create policy "trips_delete_own_or_admin" on public.trips
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

alter table public.trip_locations enable row level security;

-- itinerarul e vizibil dacă e vizibilă călătoria
drop policy if exists "trip_locations_select_visible" on public.trip_locations;
create policy "trip_locations_select_visible" on public.trip_locations
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.status = 'active' or t.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "trip_locations_write_own" on public.trip_locations;
create policy "trip_locations_write_own" on public.trip_locations
  for all to authenticated
  using (
    exists (select 1 from public.trips t
            where t.id = trip_id and (t.author_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.trips t
            where t.id = trip_id and (t.author_id = auth.uid() or public.is_admin()))
  );

alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own" on public.saves
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own" on public.saves
  for delete to authenticated using (user_id = auth.uid());
