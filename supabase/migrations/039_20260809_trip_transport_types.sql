-- =====================================================================
-- Pocoloco — Transportul unei călătorii: mai multe mijloace, nu unul
--
-- Până acum trips.transport_type ținea un singur text. Dar cazul obișnuit
-- e „cu avionul până acolo, cu mașina pe loc": un singur câmp îl obliga
-- pe om să aleagă care jumătate de adevăr o spune.
--
-- De aici: trips.transport_types text[] — lista mijloacelor, la nivel de
-- călătorie. NU e transport per segment: nu spune cum s-a ajuns de la o
-- oprire la alta, iar afișarea nu mai pretinde că spune.
--
-- transport_type rămâne pe loc, scris în continuare cu primul element.
-- Nu îl ștergem: e coloana pe care o citesc datele vechi și orice bucată
-- de cod care ne-a scăpat. Se poate scoate separat, când n-o mai citește
-- nimeni.
--
-- Rulează DUPĂ 038_20260809_publish_story_single_stop.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coloana
-- ---------------------------------------------------------------------
alter table public.trips
  add column if not exists transport_types text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------
-- 2. Normalizarea valorilor vechi
--
-- Fiecare călătorie existentă are exact un mijloc; devine listă cu un
-- element. Rândurile fără transport rămân cu lista goală — afișarea nu
-- arată nimic pentru ele, ca și până acum.
-- ---------------------------------------------------------------------
update public.trips
set transport_types = array[btrim(transport_type)]
where coalesce(array_length(transport_types, 1), 0) = 0
  and coalesce(btrim(transport_type), '') <> '';

do $$
declare
  v_gol integer;
begin
  select count(*) into v_gol
  from public.trips
  where coalesce(array_length(transport_types, 1), 0) = 0;

  raise notice 'trips.transport_types: % călătorii au rămas fără transport (n-aveau nici înainte).', v_gol;
end $$;

-- ---------------------------------------------------------------------
-- 3. publish_story() — scrie lista, și oglinda ei în coloana veche
--
-- Restul funcției e neatins față de migrarea 38.
-- ---------------------------------------------------------------------
create or replace function public.publish_story(
  p_stops jsonb,
  p_trip  jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_stop       jsonb;
  v_exp_id     uuid;
  v_trip_id    uuid;
  v_first_exp  uuid;
  v_ids        uuid[] := '{}';
  v_resolved   jsonb  := '[]'::jsonb;
  v_position   integer := 0;
  v_kind       text;
  v_day        integer;
  v_pozitii    jsonb  := '{}'::jsonb;
  v_index      integer := 0;
  v_titlu      text;
  v_transport  text[];
begin
  -- -------------------------------------------------------------------
  -- 1. Verificări — toate, înaintea oricărei scrieri
  -- -------------------------------------------------------------------
  if v_user is null then
    raise exception 'Trebuie să fii autentificat ca să publici.';
  end if;

  if p_stops is null or jsonb_typeof(p_stops) <> 'array' or jsonb_array_length(p_stops) = 0 then
    raise exception 'Nu am primit nicio oprire.';
  end if;

  for v_stop in select * from jsonb_array_elements(p_stops) loop
    v_index := v_index + 1;
    v_kind := coalesce(v_stop ->> 'kind', 'place_visit');

    if v_kind not in ('place_visit', 'activity') then
      raise exception 'Oprirea % are un tip necunoscut: %.', v_index, v_kind;
    end if;

    if v_kind = 'place_visit' and (v_stop ->> 'location_id') is null then
      raise exception 'Oprirea % e un loc, dar n-are locația salvată.', v_index;
    end if;

    if v_kind = 'activity' and coalesce(btrim(v_stop ->> 'title'), '') = '' then
      raise exception 'Oprirea % e o activitate, dar n-are titlu.', v_index;
    end if;
  end loop;

  -- călătoria are nevoie de nume; fără p_trip publicăm doar experiențe
  if p_trip is not null then
    if jsonb_typeof(p_trip) <> 'object' then
      raise exception 'Detaliile călătoriei au venit într-o formă neașteptată.';
    end if;

    v_titlu := nullif(btrim(coalesce(p_trip ->> 'title', '')), '');
    if v_titlu is null then
      raise exception 'Călătoria n-are nume.';
    end if;
  end if;

  -- -------------------------------------------------------------------
  -- 2. Experiențele
  -- -------------------------------------------------------------------
  for v_stop in select * from jsonb_array_elements(p_stops) loop
    v_kind := coalesce(v_stop ->> 'kind', 'place_visit');
    v_exp_id := null;

    -- O activitate trebuie să existe ca experiență: titlul ei n-are unde
    -- altundeva să stea. Un loc poate rămâne doar oprire, cu o notă.
    if coalesce((v_stop ->> 'create_experience')::boolean, false) or v_kind = 'activity' then
      insert into public.experiences (
        kind, location_id, title, activity_category, activity_area,
        author_id, content, images, tips,
        rating_experience, rating_access, rating_crowd,
        visited_year, visited_month, status
      )
      select
        r.kind, r.location_id, r.title, r.activity_category, r.activity_area,
        v_user,
        coalesce(r.content, ''),
        coalesce(r.images, '{}'::text[]),
        coalesce(r.tips,   '{}'::text[]),
        r.rating_experience, r.rating_access, r.rating_crowd,
        r.visited_year, r.visited_month, 'active'
      from jsonb_populate_record(null::public.experiences, v_stop) r
      returning id into v_exp_id;

      v_ids := v_ids || v_exp_id;
      if v_first_exp is null then
        v_first_exp := v_exp_id;
      end if;
    end if;

    v_resolved := v_resolved || jsonb_build_object(
      'location_id',   v_stop ->> 'location_id',
      'experience_id', v_exp_id,
      'note',          nullif(btrim(coalesce(v_stop ->> 'note', '')), ''),
      'day',           v_stop -> 'day'
    );
  end loop;

  -- -------------------------------------------------------------------
  -- 3. Fără detalii de călătorie: doar experiențe, ca până acum
  -- -------------------------------------------------------------------
  if p_trip is null then
    return jsonb_build_object(
      'trip_id', null,
      'experience_id', v_first_exp,
      'experience_ids', to_jsonb(v_ids)
    );
  end if;

  -- -------------------------------------------------------------------
  -- 4. Transportul — lista, dacă a venit; altfel valoarea veche
  --
  -- Un client care încă trimite doar transport_type publică la fel de
  -- bine ca înainte.
  -- -------------------------------------------------------------------
  select
    case
      when coalesce(array_length(r.transport_types, 1), 0) > 0 then r.transport_types
      when coalesce(btrim(r.transport_type), '') <> ''          then array[btrim(r.transport_type)]
      else array['car']
    end
  into v_transport
  from jsonb_populate_record(null::public.trips, p_trip) r;

  -- -------------------------------------------------------------------
  -- 5. Călătoria — de la prima oprire, nu de la a doua
  -- -------------------------------------------------------------------
  insert into public.trips (
    author_id, title, description, duration_days,
    transport_type, transport_types, countries, cover_image, cover_source, status
  )
  select
    v_user,
    v_titlu,
    r.description,
    greatest(coalesce(r.duration_days, 1), 1),
    v_transport[1],
    v_transport,
    r.countries,
    r.cover_image,
    case when coalesce(r.cover_image, '') <> '' then 'user' else 'auto' end,
    'active'
  from jsonb_populate_record(null::public.trips, p_trip) r
  returning id into v_trip_id;

  if v_trip_id is null then
    raise exception 'Călătoria nu a putut fi creată.';
  end if;

  -- ziua aleasă la finalizare, altfel 1; poziția se numără pe fiecare zi
  for v_stop in select * from jsonb_array_elements(v_resolved) loop
    v_day := greatest(coalesce((v_stop ->> 'day')::integer, 1), 1);
    v_position := coalesce((v_pozitii ->> v_day::text)::integer, 0);

    insert into public.trip_locations (
      trip_id, location_id, experience_id, day_number, position, note
    )
    values (
      v_trip_id,
      nullif(v_stop ->> 'location_id', '')::uuid,
      nullif(v_stop ->> 'experience_id', '')::uuid,
      v_day,
      v_position,
      v_stop ->> 'note'
    );

    v_pozitii := jsonb_set(v_pozitii, array[v_day::text], to_jsonb(v_position + 1));
  end loop;

  -- abia acum există opririle, deci lanțul de fallback are ce căuta
  perform public.apply_trip_auto_cover(v_trip_id);

  return jsonb_build_object(
    'trip_id', v_trip_id,
    'experience_id', v_first_exp,
    'experience_ids', to_jsonb(v_ids)
  );
end $$;

grant execute on function public.publish_story(jsonb, jsonb) to authenticated;

do $$
begin
  raise notice 'trips.transport_types există, valorile vechi sunt normalizate, publish_story() scrie lista și oglinda ei în transport_type.';
end $$;
