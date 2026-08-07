-- =====================================================================
-- Pocoloco — Ce se întâmplă când dispare o locație
--
-- Ștergerea unei locații din admin crăpa pe cheia străină din
-- trip_locations: o oprire arăta spre un loc care nu mai exista, iar
-- baza refuza, pe bună dreptate.
--
-- Regula, pe tabele:
--
--   trip_locations.location_id  -> ON DELETE SET NULL
--     O oprire poate arăta spre o experiență în loc de un loc (migrarea
--     28), deci una cu poveste supraviețuiește fără pin. Cele care aveau
--     DOAR locul n-ar mai avea spre ce arăta și ar încălca
--     trip_locations_target_check — pe alea le șterge funcția de mai jos,
--     înainte de a ajunge la locație.
--
--   saves.location_id           -> ON DELETE CASCADE
--     Un „vreau să merg" sau „am fost" spre un loc care nu mai există nu
--     mai înseamnă nimic, iar saves_target_check cere oricum ca măcar una
--     dintre location_id / trip_id să fie completată — deci SET NULL ar
--     produce un rând invalid. Cascade e singura variantă corectă.
--
--   experiences.location_id     -> neatins, intenționat
--     O experiență de tip 'place_visit' cere locația prin
--     experiences_kind_target_check. Nu putem nici s-o ștergem în tăcere
--     (e conținut scris de om), nici să-i punem null. De asta funcția
--     refuză ștergerea cât timp există măcar una, cu mesaj clar.
--
-- Ștergerea trece prin admin_delete_location(), nu prin DELETE direct:
-- ordinea contează, iar corpul funcției e o singură tranzacție.
--
-- Rulează DUPĂ 028_20260808_trip_activity_stops.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Ce mai arată spre locations, în afară de ce știm
-- ---------------------------------------------------------------------
do $$
declare
  r      record;
  altele text := '';
begin
  for r in
    select c.conrelid::regclass::text as tabel,
           a.attname                  as coloana,
           case c.confdeltype
             when 'a' then 'no action' when 'r' then 'restrict'
             when 'c' then 'cascade'   when 'n' then 'set null'
             when 'd' then 'set default' else c.confdeltype::text
           end as la_stergere
    from pg_constraint c
    join unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f' and c.confrelid = 'public.locations'::regclass
    order by 1, 2
  loop
    raise notice '  FK spre locations: %.% (la ștergere: %)', r.tabel, r.coloana, r.la_stergere;
    if r.tabel not in ('trip_locations', 'saves', 'experiences') then
      altele := altele || r.tabel || '.' || r.coloana || ' ';
    end if;
  end loop;

  if altele <> '' then
    raise notice 'ATENȚIE: mai există chei străine spre locations pe care migrarea asta nu le atinge: %. Verifică-le manual.', altele;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. trip_locations.location_id -> set null
--    Constrângerea se caută după coloană, nu după nume: numele diferă
--    între instalări (unele tabele vin din schema inițială).
-- ---------------------------------------------------------------------
do $$
declare
  v_nume text;
  v_mod  char;
begin
  select c.conname, c.confdeltype into v_nume, v_mod
  from pg_constraint c
  join unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.contype = 'f'
    and c.conrelid = 'public.trip_locations'::regclass
    and c.confrelid = 'public.locations'::regclass
    and a.attname = 'location_id'
  limit 1;

  if v_nume is null then
    raise notice 'trip_locations n-are cheie străină spre locations — nimic de schimbat.';
  elsif v_mod = 'n' then
    raise notice 'trip_locations.location_id era deja pe SET NULL (%).', v_nume;
  else
    execute format('alter table public.trip_locations drop constraint %I', v_nume);
    alter table public.trip_locations
      add constraint trip_locations_location_id_fkey
      foreign key (location_id) references public.locations (id) on delete set null;
    raise notice 'trip_locations.location_id: % înlocuită cu SET NULL.', v_nume;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. saves.location_id -> cascade
-- ---------------------------------------------------------------------
do $$
declare
  v_nume text;
  v_mod  char;
begin
  select c.conname, c.confdeltype into v_nume, v_mod
  from pg_constraint c
  join unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.contype = 'f'
    and c.conrelid = 'public.saves'::regclass
    and c.confrelid = 'public.locations'::regclass
    and a.attname = 'location_id'
  limit 1;

  if v_nume is null then
    raise notice 'saves n-are cheie străină spre locations — nimic de schimbat.';
  elsif v_mod = 'c' then
    raise notice 'saves.location_id era deja pe CASCADE (%).', v_nume;
  else
    execute format('alter table public.saves drop constraint %I', v_nume);
    alter table public.saves
      add constraint saves_location_id_fkey
      foreign key (location_id) references public.locations (id) on delete cascade;
    raise notice 'saves.location_id: % înlocuită cu CASCADE.', v_nume;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Ștergerea propriu-zisă
--
--    Ordinea: întâi opririle rămase fără rost, apoi locația. Restul le
--    face SET NULL. Corpul funcției e o tranzacție: dacă pică ceva la
--    mijloc, nu rămâne nici locația ștearsă pe jumătate, nici opriri
--    dispărute degeaba.
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_location(p_location_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nume          text;
  v_place_visits  integer;
  v_activitati    integer;
  v_opriri_sterse integer;
  v_opriri_pastr  integer;
  v_calatorii     integer;
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii pot șterge locații.';
  end if;

  select name into v_nume from public.locations where id = p_location_id;
  if v_nume is null then
    raise exception 'Locația nu există.';
  end if;

  -- Experiențele de loc o cer prin experiences_kind_target_check: n-au
  -- cum să rămână fără ea și n-avem dreptul să le ștergem noi.
  select count(*) filter (where kind = 'place_visit'),
         count(*) filter (where kind <> 'place_visit')
    into v_place_visits, v_activitati
  from public.experiences
  where location_id = p_location_id;

  if v_place_visits > 0 then
    raise exception
      'Locația „%" are % experiențe scrise de useri și nu poate fi ștearsă. Respinge-o din moderare dacă vrei s-o scoți din căutare.',
      v_nume, v_place_visits;
  end if;

  -- O activitate n-are nevoie de loc: îi rupem legătura, nu o ștergem
  if v_activitati > 0 then
    update public.experiences set location_id = null
     where location_id = p_location_id;
  end if;

  select count(*) filter (where experience_id is null),
         count(*) filter (where experience_id is not null),
         count(distinct trip_id)
    into v_opriri_sterse, v_opriri_pastr, v_calatorii
  from public.trip_locations
  where location_id = p_location_id;

  -- Opririle care arătau DOAR spre locul ăsta n-ar mai avea spre ce, iar
  -- trip_locations_target_check le-ar respinge. Pleacă înaintea locației.
  delete from public.trip_locations
   where location_id = p_location_id and experience_id is null;

  -- restul: SET NULL le lasă în itinerar, cu povestea lor, fără pin
  delete from public.locations where id = p_location_id;

  return jsonb_build_object(
    'ok', true,
    'name', v_nume,
    'trips', v_calatorii,
    'stops_deleted', v_opriri_sterse,
    'stops_kept', v_opriri_pastr,
    'activities_unlinked', v_activitati
  );
end $$;

grant execute on function public.admin_delete_location(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Verificare
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass::text as tabel,
           a.attname as coloana,
           case c.confdeltype
             when 'a' then 'no action' when 'r' then 'restrict'
             when 'c' then 'cascade'   when 'n' then 'set null'
             when 'd' then 'set default' else c.confdeltype::text
           end as la_stergere
    from pg_constraint c
    join unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f' and c.confrelid = 'public.locations'::regclass
    order by 1, 2
  loop
    raise notice '  după migrare: %.% -> %', r.tabel, r.coloana, r.la_stergere;
  end loop;
end $$;
