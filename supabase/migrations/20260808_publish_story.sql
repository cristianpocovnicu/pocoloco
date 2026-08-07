-- =====================================================================
-- Pocoloco — Publicarea unei povești, dintr-o singură bucată
--
-- Ecranul de creare poate produce, dintr-o apăsare: mai multe experiențe,
-- o călătorie și opririle ei. Din client astea ar fi 5-10 inserturi
-- separate, iar o eroare la jumătate ar lăsa în bază o călătorie fără
-- opriri sau experiențe orfane.
--
-- Corpul unei funcții PL/pgSQL e o singură tranzacție: ori intră tot, ori
-- nimic. De asta publicarea trece pe aici.
--
-- Ce NU face funcția: nu creează locații. Locul din Google devine locație
-- înainte, din client — o locație în moderare rămasă în urma unei
-- publicări eșuate e invizibilă și inofensivă.
--
-- Rulează DUPĂ 20260808_experience_kinds.sql și
-- 20260808_trip_activity_stops.sql.
-- =====================================================================

/**
 * p_stops: [{
 *   kind, location_id, title, activity_category, activity_area,
 *   content, images, tips, rating_experience, rating_access, rating_crowd,
 *   note,               -- nota de itinerar, rămâne pe trip_locations
 *   create_experience   -- false => oprirea e doar un rând de itinerar
 * }]
 * p_trip: null pentru o singură oprire, altfel { title, duration_days,
 *         transport_type, countries, cover_image }
 *
 * Întoarce { trip_id, experience_id, experience_ids }.
 */
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

  -- -------------------------------------------------------------------
  -- 1. Experiențele. Fiecare intră cu un singur insert, complet — așa
  --    prind toate bonusurile de completitudine din points_after_experience.
  -- -------------------------------------------------------------------
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
      -- jsonb_populate_record convertește fiecare câmp la tipul real al
      -- coloanei, deci merge la fel dacă images/tips sunt text[] sau jsonb
      insert into public.experiences (
        kind, location_id, title, activity_category, activity_area,
        author_id, content, images, tips,
        rating_experience, rating_access, rating_crowd, status
      )
      select
        r.kind, r.location_id, r.title, r.activity_category, r.activity_area,
        v_user, coalesce(r.content, ''), r.images, r.tips,
        coalesce(r.rating_experience, 0), r.rating_access, r.rating_crowd, 'active'
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

  -- -------------------------------------------------------------------
  -- 2. O singură oprire => nu inventăm o călătorie
  -- -------------------------------------------------------------------
  if p_trip is null or jsonb_array_length(p_stops) < 2 then
    return jsonb_build_object(
      'trip_id', null,
      'experience_id', v_first_exp,
      'experience_ids', to_jsonb(v_ids)
    );
  end if;

  -- -------------------------------------------------------------------
  -- 3. Călătoria, tot dintr-un singur insert (bonusurile +copertă,
  --    +rezumat, +public din points_after_trip se uită la rândul întreg)
  -- -------------------------------------------------------------------
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

  -- -------------------------------------------------------------------
  -- 4. Opririle, în ordinea de pe ecran. Toate pe ziua 1: împărțirea pe
  --    zile se face din editare, unde se vede tot itinerarul.
  -- -------------------------------------------------------------------
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
-- Verificare: ce constrângeri are `experiences` pe ratinguri?
--
-- În fluxul nou ratingurile sunt opționale, deci o experiență poate intra
-- cu rating_experience = 0. Dacă vezi mai jos o constrângere care cere
-- 1..5, spune-mi — atunci fie o relaxăm, fie trimitem null.
-- ---------------------------------------------------------------------
do $$
declare
  r        record;
  gasite   text := '';
begin
  for r in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.experiences'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%rating%'
  loop
    gasite := gasite || r.conname || ': ' || r.def || '; ';
  end loop;

  if gasite = '' then
    raise notice 'Niciun check pe ratinguri — 0 („nenotat") intră fără probleme.';
  else
    raise notice 'ATENȚIE, checkuri pe ratinguri: %', gasite;
  end if;
end $$;
