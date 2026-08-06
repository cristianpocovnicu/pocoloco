-- =====================================================================
-- Pocoloco — Reconciliere trip_locations
--
-- Migrarea 20260806_trips.sql a adăugat o coloană `day`, presupunând că
-- tabelul nu are una. În realitate exista deja `day_number`, NOT NULL și
-- fără default — așa că publicarea unui itinerar crăpa:
--   null value in column "day_number" violates not-null constraint
--
-- Aici păstrăm coloana reală (day_number), mutăm în ea ce apucase să
-- ajungă în `day`, îi punem un default ca insertul să nu mai poată eșua
-- din cauza ei, și scăpăm de coloana duplicat.
--
-- Rulează DUPĂ supabase/checks/inspect_trip_locations.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Asigurăm existența coloanei day_number
--    (dacă instalarea ta chiar n-o avea, o creăm acum)
-- ---------------------------------------------------------------------
alter table public.trip_locations
  add column if not exists day_number integer not null default 1;

-- ---------------------------------------------------------------------
-- 2. Mutăm datele din `day` și eliminăm duplicatul
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trip_locations' and column_name = 'day'
  ) then
    execute 'update public.trip_locations set day_number = coalesce(day_number, day, 1)';
    execute 'alter table public.trip_locations drop column day';
    raise notice 'Coloana day a fost mutată în day_number și ștearsă.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Default pe day_number, ca un insert fără ea să nu mai crape
-- ---------------------------------------------------------------------
update public.trip_locations set day_number = 1 where day_number is null;

alter table public.trip_locations alter column day_number set default 1;
alter table public.trip_locations alter column day_number set not null;

-- ---------------------------------------------------------------------
-- 4. Restul coloanelor folosite de aplicație, cu default unde e cazul
-- ---------------------------------------------------------------------
alter table public.trip_locations add column if not exists note text;
alter table public.trip_locations add column if not exists position integer not null default 0;
alter table public.trip_locations alter column position set default 0;

-- indexul urmează noua coloană
drop index if exists trip_locations_trip_idx;
create index if not exists trip_locations_trip_idx
  on public.trip_locations (trip_id, day_number, position);

-- ---------------------------------------------------------------------
-- 5. Avertisment: mai există coloane NOT NULL fără default pe care
--    aplicația nu le completează?
-- ---------------------------------------------------------------------
do $$
declare
  problema text;
begin
  select string_agg(column_name, ', ') into problema
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'trip_locations'
    and is_nullable = 'NO'
    and column_default is null
    and column_name not in ('id', 'trip_id', 'location_id', 'day_number', 'position');

  if problema is not null then
    raise notice 'ATENȚIE: trip_locations mai are coloane NOT NULL fără default, pe care aplicația nu le scrie: %. Publicarea unui itinerar va eșua până le dai un default.', problema;
  end if;
end $$;
