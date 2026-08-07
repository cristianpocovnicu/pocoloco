-- =====================================================================
-- Pocoloco — Opriri de tip activitate în itinerar
--
-- O călătorie devine un album: pe lângă locuri, poate conține și
-- activități („tură cu buggy lângă Sharm el-Sheikh"), care n-au pin pe
-- hartă. O oprire trimite deci ori la o locație, ori la o experiență.
--
-- Nu stricăm nimic din itinerariile existente: toate au location_id
-- completat, iar constrângerea le acceptă neschimbate.
--
-- Rulează DUPĂ 016_20260806_trip_locations_fix.sql și
-- 027_20260808_experience_kinds.sql.
-- =====================================================================

alter table public.trip_locations
  add column if not exists experience_id uuid references public.experiences (id) on delete cascade;

-- ---------------------------------------------------------------------
-- location_id devine opțional, dar o oprire trebuie să arate spre ceva
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trip_locations'
      and column_name = 'location_id' and is_nullable = 'NO'
  ) then
    alter table public.trip_locations alter column location_id drop not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'trip_locations_target_check') then
    alter table public.trip_locations
      add constraint trip_locations_target_check
      check (location_id is not null or experience_id is not null)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.trip_locations validate constraint trip_locations_target_check;
exception when others then
  raise notice 'ATENȚIE: trip_locations_target_check nu a putut fi validată: %. Caută opririle orfane cu: select * from public.trip_locations where location_id is null and experience_id is null;', sqlerrm;
end $$;

create index if not exists trip_locations_experience_idx
  on public.trip_locations (experience_id) where experience_id is not null;

-- ---------------------------------------------------------------------
-- Aceeași experiență nu are ce căuta de două ori în aceeași călătorie
-- ---------------------------------------------------------------------
do $$
begin
  create unique index if not exists trip_locations_trip_experience_idx
    on public.trip_locations (trip_id, experience_id) where experience_id is not null;
exception when others then
  raise notice 'Indexul trip_locations_trip_experience_idx nu a putut fi creat (probabil ai deja duplicate): %', sqlerrm;
end $$;
