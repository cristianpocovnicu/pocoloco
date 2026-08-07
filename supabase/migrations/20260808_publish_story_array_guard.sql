-- =====================================================================
-- Pocoloco — images și tips nu mai pot rămâne NULL
--
-- Ambele coloane sunt `text[]`, nullable și fără default. Aplicația
-- trimite mereu un array, dar nimic din schemă nu garantează asta: un
-- insert care le omite le lasă NULL, iar de acolo codul care face
-- `.length` sau `.map` primește null în loc de listă.
--
-- Aici facem două lucruri:
--   1. `publish_story()` scrie '{}' în loc de NULL, dacă payload-ul n-are
--      cheile (nu le are niciodată azi, dar funcția e apelabilă și de
--      altcineva mâine)
--   2. rândurile vechi rămase cu NULL devin array gol
--
-- Ce NU facem: nu punem NOT NULL și nu adăugăm default. Ar fi o schimbare
-- de schemă peste ce e deja în producție, iar codul nu depinde de ea —
-- fiecare loc care le citește apără null oricum.
--
-- Rulează DUPĂ 20260808_publish_story.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verificare: chiar sunt text[]?
--
--    coalesce(..., '{}'::text[]) de mai jos presupune asta. Dacă vreuna
--    ar fi jsonb, '{}' ar însemna obiect gol, nu listă goală, iar
--    jsonb_array_length din triggerul de puncte ar crăpa.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select column_name, data_type, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences'
      and column_name in ('images', 'tips')
    order by column_name
  loop
    raise notice '  % — tip: % (%), nullable: %, default: %',
      rpad(r.column_name, 8), r.data_type, r.udt_name, r.is_nullable,
      coalesce(r.column_default, 'fără');

    if r.udt_name <> '_text' then
      raise exception
        'Coloana experiences.% nu e text[] ci %. Oprește-te: coalesce-ul din publish_story() ar fi greșit pentru tipul ăsta.',
        r.column_name, r.udt_name;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. publish_story(), cu array gol în loc de NULL
--    (restul funcției e neschimbat față de migrarea 30)
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
  v_user      uuid := auth.uid();
  v_stop      jsonb;
  v_exp_id    uuid;
  v_trip_id   uuid;
  v_first_exp uuid;
  v_ids       uuid[] := '{}';
  v_resolved  jsonb  := '[]'::jsonb;
  v_position  integer := 0;
  v_kind      text;
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
        rating_experience, rating_access, rating_crowd, status
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
        r.rating_experience, r.rating_access, r.rating_crowd, 'active'
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
      'note',          nullif(btrim(coalesce(v_stop ->> 'note', '')), '')
    );
  end loop;

  if p_trip is null or jsonb_array_length(p_stops) < 2 then
    return jsonb_build_object(
      'trip_id', null,
      'experience_id', v_first_exp,
      'experience_ids', to_jsonb(v_ids)
    );
  end if;

  insert into public.trips (
    author_id, title, description, duration_days,
    transport_type, countries, cover_image, status
  )
  select
    v_user,
    nullif(btrim(coalesce(r.title, '')), ''),
    r.description,
    greatest(coalesce(r.duration_days, 1), 1),
    coalesce(r.transport_type, 'car'),
    r.countries,
    r.cover_image,
    'active'
  from jsonb_populate_record(null::public.trips, p_trip) r
  returning id into v_trip_id;

  if v_trip_id is null then
    raise exception 'Călătoria nu a putut fi creată.';
  end if;

  for v_stop in select * from jsonb_array_elements(v_resolved) loop
    insert into public.trip_locations (
      trip_id, location_id, experience_id, day_number, position, note
    )
    values (
      v_trip_id,
      nullif(v_stop ->> 'location_id', '')::uuid,
      nullif(v_stop ->> 'experience_id', '')::uuid,
      1,
      v_position,
      v_stop ->> 'note'
    );
    v_position := v_position + 1;
  end loop;

  return jsonb_build_object(
    'trip_id', v_trip_id,
    'experience_id', v_first_exp,
    'experience_ids', to_jsonb(v_ids)
  );
end $$;

grant execute on function public.publish_story(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Rândurile vechi rămase cu NULL
-- ---------------------------------------------------------------------
do $$
declare
  v_images integer;
  v_tips   integer;
begin
  update public.experiences set images = '{}'::text[] where images is null;
  get diagnostics v_images = row_count;

  update public.experiences set tips = '{}'::text[] where tips is null;
  get diagnostics v_tips = row_count;

  if v_images = 0 and v_tips = 0 then
    raise notice 'Nicio experiență cu images sau tips null — nimic de normalizat.';
  else
    raise notice 'Normalizate: % rânduri cu images null, % cu tips null.', v_images, v_tips;
  end if;
end $$;
