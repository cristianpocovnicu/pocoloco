-- =====================================================================
-- Pocoloco — Publicarea: verifică întâi, scrie după
--
-- Două defecte ale versiunii de până acum (migrarea 35):
--
--   1. Ordinea. Funcția insera experiențele și abia apoi se uita dacă
--      poate face călătoria. Cu o singură oprire ieșea din ea cu
--      trip_id null — dar experiența rămânea scrisă, iar clientul primea
--      o eroare generică peste date deja salvate.
--
--   2. Pragul. O călătorie se făcea doar de la două opriri. Dar o poveste
--      pornită de la o zonă („Madeira") are nume propriu de la început:
--      cu un singur loc e o călătorie scurtă, nu o experiență răzleață.
--
-- De aici: toate verificările se fac înaintea primului insert, iar
-- călătoria se creează de la prima oprire dacă p_trip există. Fără p_trip
-- comportamentul rămâne neatins — doar experiențe.
--
-- Punctele nu se schimbă: o călătorie cu o oprire primește baza și
-- bonusurile ca oricare alta, prin același trigger.
--
-- Rulează DUPĂ 035_20260808_publish_story_days.sql.
-- =====================================================================

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
  v_user      uuid := auth.uid();
  v_stop      jsonb;
  v_exp_id    uuid;
  v_trip_id   uuid;
  v_first_exp uuid;
  v_ids       uuid[] := '{}';
  v_resolved  jsonb  := '[]'::jsonb;
  v_position  integer := 0;
  v_kind      text;
  v_day       integer;
  v_pozitii   jsonb  := '{}'::jsonb;
  v_index     integer := 0;
  v_titlu     text;
begin
  -- -------------------------------------------------------------------
  -- 1. Verificări — toate, înaintea oricărei scrieri
  --
  --    Un refuz de aici nu lasă nimic în urmă: raise exception anulează
  --    tranzacția, iar noi n-am apucat să inserăm nimic oricum.
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
  -- 4. Călătoria — de la prima oprire, nu de la a doua
  -- -------------------------------------------------------------------
  insert into public.trips (
    author_id, title, description, duration_days,
    transport_type, countries, cover_image, cover_source, status
  )
  select
    v_user,
    v_titlu,
    r.description,
    greatest(coalesce(r.duration_days, 1), 1),
    coalesce(r.transport_type, 'car'),
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
  raise notice 'publish_story(): verificările se fac înaintea scrierilor, iar o călătorie se creează de la prima oprire când primește detalii.';
end $$;
