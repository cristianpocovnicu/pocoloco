-- =====================================================================
-- Pocoloco — Copertă automată pentru călătorii
--
-- O călătorie fără copertă arată ca un card gol în listă și în feed. În
-- loc să punem un fallback la afișare (care ar însemna aceeași logică
-- copiată în cinci componente și recalculată la fiecare randare),
-- completăm câmpul o dată, în bază, la publicare și retroactiv.
--
-- Lanțul, în ordinea opririlor:
--   1. prima poză a unei experiențe legate de o oprire — fie direct
--      (trip_locations.experience_id), fie experiența autorului la locul
--      opririi
--   2. coperta locației primei opriri care are una (multe vin din Google,
--      vezi migrarea 20)
--   3. nimic — se întâmplă doar dacă toate opririle sunt activități fără
--      poze, sau locuri fără poze și fără copertă
--
-- `cover_source` spune cine a pus-o, ca punctele să nu premieze o alegere
-- pe care n-a făcut-o nimeni. Același model ca locations.cover_source.
--
-- Rulează DUPĂ 028_20260808_trip_activity_stops.sql.
-- =====================================================================

alter table public.trips add column if not exists cover_source text not null default 'user';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_cover_source_check') then
    alter table public.trips
      add constraint trips_cover_source_check
      check (cover_source in ('user', 'auto'))
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.trips validate constraint trips_cover_source_check;
exception when others then
  raise notice 'ATENȚIE: trips_cover_source_check nu a putut fi validată: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 1. Lanțul de fallback, într-un singur loc
--
--    Îl folosesc backfill-ul de mai jos, publish_story() și ecranele de
--    creare/editare, prin apply_trip_auto_cover().
-- ---------------------------------------------------------------------
create or replace function public.trip_auto_cover(p_trip_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_cover  text;
begin
  if p_trip_id is null then return null; end if;

  select author_id into v_author from public.trips where id = p_trip_id;

  -- 1. prima poză dintr-o experiență legată de o oprire
  select img into v_cover
  from (
    select tl.day_number, tl.position,
           coalesce(
             (select e.images[1] from public.experiences e
               where e.id = tl.experience_id
                 and coalesce(array_length(e.images, 1), 0) > 0),
             (select e.images[1] from public.experiences e
               where e.location_id = tl.location_id
                 and e.author_id = v_author
                 and e.status = 'active'
                 and coalesce(array_length(e.images, 1), 0) > 0
               order by e.created_at
               limit 1)
           ) as img
    from public.trip_locations tl
    where tl.trip_id = p_trip_id
  ) candidate
  where img is not null and img <> ''
  order by day_number, position
  limit 1;

  if v_cover is not null then
    return v_cover;
  end if;

  -- 2. coperta locației primei opriri care are una
  select l.cover_image into v_cover
  from public.trip_locations tl
  join public.locations l on l.id = tl.location_id
  where tl.trip_id = p_trip_id
    and l.cover_image is not null and l.cover_image <> ''
  order by tl.day_number, tl.position
  limit 1;

  return v_cover;
exception when others then
  raise notice 'trip_auto_cover(%): %', p_trip_id, sqlerrm;
  return null;
end $$;

/**
 * Completează coperta unei călătorii, dacă lipsește. Întoarce ce a pus,
 * sau null dacă n-a găsit nimic. Nu suprascrie niciodată o copertă
 * existentă — dacă vrei recalcul, șterge-o întâi.
 */
create or replace function public.apply_trip_auto_cover(p_trip_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_cover  text;
  v_curent text;
begin
  select author_id, cover_image into v_author, v_curent
  from public.trips where id = p_trip_id;

  if v_author is null then return null; end if;

  -- doar autorul (sau un admin) poate umbla la călătoria lui
  if auth.uid() is not null and auth.uid() <> v_author and not public.is_admin() then
    return null;
  end if;

  if v_curent is not null and v_curent <> '' then
    return v_curent;
  end if;

  v_cover := public.trip_auto_cover(p_trip_id);
  if v_cover is null then return null; end if;

  update public.trips
     set cover_image = v_cover, cover_source = 'auto'
   where id = p_trip_id;

  return v_cover;
end $$;

grant execute on function public.apply_trip_auto_cover(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Punctele: coperta pusă de sistem nu se premiază
--
--    Decizie de produs: bonusul de +3 răsplătește alegerea unei imagini,
--    nu existența ei. Restul funcției e neschimbat.
-- ---------------------------------------------------------------------
create or replace function public.points_after_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := 20;
  v_parts  text[]  := array['bază'];
begin
  if new.status is distinct from 'active' then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'active' then
      return null;
    end if;
  end if;

  -- doar coperta aleasă de om aduce bonusul
  if new.cover_image is not null and new.cover_image <> ''
     and coalesce(new.cover_source, 'user') = 'user' then
    v_points := v_points + 3; v_parts := v_parts || 'copertă';
  end if;
  if coalesce(btrim(new.description), '') <> '' then
    v_points := v_points + 3; v_parts := v_parts || 'rezumat';
  end if;
  -- toate călătoriile sunt publice deocamdată; când apare opțiunea de
  -- privat, condiția se schimbă aici
  v_points := v_points + 8; v_parts := v_parts || 'public';

  perform public.award_points(
    new.author_id, null, 'trip_posted', 'trip', new.id, v_points,
    jsonb_build_object('parts', v_parts)
  );
  return null;
exception when others then
  raise notice 'points_after_trip(%): %', new.id, sqlerrm;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------
do $$
declare
  r            record;
  v_cover      text;
  v_din_poze   integer := 0;
  v_din_loc    integer := 0;
  v_ramase     integer := 0;
begin
  for r in
    select id from public.trips
    where cover_image is null or cover_image = ''
  loop
    -- calea 1: poza unei experiențe de pe traseu
    select img into v_cover
    from (
      select tl.day_number, tl.position,
             coalesce(
               (select e.images[1] from public.experiences e
                 where e.id = tl.experience_id
                   and coalesce(array_length(e.images, 1), 0) > 0),
               (select e.images[1] from public.experiences e
                 join public.trips t on t.id = tl.trip_id
                 where e.location_id = tl.location_id
                   and e.author_id = t.author_id
                   and e.status = 'active'
                   and coalesce(array_length(e.images, 1), 0) > 0
                 order by e.created_at
                 limit 1)
             ) as img
      from public.trip_locations tl
      where tl.trip_id = r.id
    ) candidate
    where img is not null and img <> ''
    order by day_number, position
    limit 1;

    if v_cover is not null then
      update public.trips set cover_image = v_cover, cover_source = 'auto' where id = r.id;
      v_din_poze := v_din_poze + 1;
      continue;
    end if;

    -- calea 2: coperta locației
    select l.cover_image into v_cover
    from public.trip_locations tl
    join public.locations l on l.id = tl.location_id
    where tl.trip_id = r.id
      and l.cover_image is not null and l.cover_image <> ''
    order by tl.day_number, tl.position
    limit 1;

    if v_cover is not null then
      update public.trips set cover_image = v_cover, cover_source = 'auto' where id = r.id;
      v_din_loc := v_din_loc + 1;
    else
      v_ramase := v_ramase + 1;
    end if;
  end loop;

  raise notice 'Coperte completate: % din pozele opririlor, % din copertele locațiilor.', v_din_poze, v_din_loc;
  if v_ramase > 0 then
    raise notice '% călătorii au rămas fără copertă — n-au nicio oprire cu poze sau cu loc care are copertă.', v_ramase;
  else
    raise notice 'Nicio călătorie fără copertă.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Verificare
-- ---------------------------------------------------------------------
do $$
declare
  v_total integer;
  v_user  integer;
  v_auto  integer;
  v_fara  integer;
begin
  select count(*),
         count(*) filter (where cover_source = 'user' and cover_image is not null),
         count(*) filter (where cover_source = 'auto'),
         count(*) filter (where cover_image is null or cover_image = '')
    into v_total, v_user, v_auto, v_fara
  from public.trips;

  raise notice 'Călătorii: % total, % cu copertă de la user, % completate automat, % fără nimic.',
    v_total, v_user, v_auto, v_fara;
end $$;
