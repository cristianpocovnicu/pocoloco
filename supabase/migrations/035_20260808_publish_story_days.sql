-- =====================================================================
-- Pocoloco — Zilele alese pentru fiecare loc
--
-- Detaliile călătoriei s-au mutat într-un al doilea pas, unde durata și
-- lista locurilor se văd împreună. Acolo se poate spune „locul ăsta a
-- fost în ziua 2", iar publicarea trebuie să ducă alegerea mai departe.
--
-- Până acum publish_story() punea toate opririle pe ziua 1. Acum scrie
-- ziua primită în payload (`day`), cu 1 ca valoare de rezervă — coloana
-- din bază e day_number, NOT NULL, reconciliată de migrarea 16.
--
-- Singura schimbare față de versiunea din migrarea 34.
--
-- Rulează DUPĂ 034_20260808_visited_period.sql.
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
begin
  if v_user is null then
    raise exception 'Trebuie să fii autentificat ca să publici.';
  end if;
  if p_stops is null or jsonb_array_length(p_stops) = 0 then
    raise exception 'Nu am primit nicio oprire.';
  end if;

  for v_stop in select * from jsonb_array_elements(p_stops) loop
    v_kind := coalesce(v_stop ->> 'kind', 'place_visit');
    v_exp_id := null;

    if v_kind = 'place_visit' and (v_stop ->> 'location_id') is null then
      raise exception 'O oprire de tip loc n-are locație.';
    end if;
    if v_kind = 'activity' and coalesce(btrim(v_stop ->> 'title'), '') = '' then
      raise exception 'O activitate n-are titlu.';
    end if;

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
        -- content e NOT NULL; images/tips sunt nullable, dar codul care le
        -- citește merită o listă goală, nu un null
        coalesce(r.content, ''),
        coalesce(r.images, '{}'::text[]),
        coalesce(r.tips,   '{}'::text[]),
        -- nenotat = NULL: checkurile de pe ratinguri acceptă doar 1–5
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

  if p_trip is null or jsonb_array_length(p_stops) < 2 then
    return jsonb_build_object(
      'trip_id', null,
      'experience_id', v_first_exp,
      'experience_ids', to_jsonb(v_ids)
    );
  end if;

  -- coperta vine din payload doar dacă userul a ales una; altfel o
  -- completăm după ce există opririle, cu apply_trip_auto_cover
  insert into public.trips (
    author_id, title, description, duration_days,
    transport_type, countries, cover_image, cover_source, status
  )
  select
    v_user,
    nullif(btrim(coalesce(r.title, '')), ''),
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

  -- Ziua aleasă la pasul de finalizare, altfel 1. Poziția se numără
  -- separat pe fiecare zi, ca ordinea din ecran să se păstreze în ziua ei.
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
  raise notice 'publish_story() scrie acum ziua aleasă pentru fiecare loc (day_number).';
end $$;
