-- =====================================================================
-- Pocoloco — Când ai fost acolo
--
-- „Am fost în august" schimbă complet felul în care citești o recenzie:
-- aglomerația, vremea, prețurile, ce era deschis. Data postării nu spune
-- nimic despre asta — poți scrie iarna despre o vară.
--
-- Ambele coloane sunt opționale. Anul poate exista fără lună („am fost
-- în 2024, nu mai știu exact când"), luna fără an nu — ar fi o informație
-- fără sens.
--
-- Migrarea actualizează și publish_story(), ca perioada să intre și când
-- publici mai multe locuri deodată.
--
-- Rulează DUPĂ 20260808_publish_story_array_guard.sql.
-- =====================================================================

alter table public.experiences add column if not exists visited_year  smallint;
alter table public.experiences add column if not exists visited_month smallint;

-- ---------------------------------------------------------------------
-- Constrângeri
--
-- Marginea de sus e 2100, nu „anul curent + 1": un CHECK nu poate folosi
-- now(), pentru că funcțiile dintr-un check trebuie să fie IMMUTABLE. Un
-- an fixat acum (2027) ar începe să respingă date valide peste câteva
-- luni. Aici e doar plasa de siguranță împotriva unui 19999 din greșeală;
-- limita reală, „anul curent + 1", o pune interfața, unde se poate muta
-- singură. Dacă vrei limita strictă și în bază, locul ei e un trigger,
-- care are voie să cheme now().
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'experiences_visited_year_check') then
    alter table public.experiences
      add constraint experiences_visited_year_check
      check (visited_year is null or (visited_year between 1990 and 2100))
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experiences_visited_month_check') then
    alter table public.experiences
      add constraint experiences_visited_month_check
      check (visited_month is null or (visited_month between 1 and 12))
      not valid;
  end if;

  -- luna fără an n-ar spune nimic
  if not exists (select 1 from pg_constraint where conname = 'experiences_visited_pair_check') then
    alter table public.experiences
      add constraint experiences_visited_pair_check
      check (visited_month is null or visited_year is not null)
      not valid;
  end if;
end $$;

do $$
declare
  c text;
begin
  foreach c in array array[
    'experiences_visited_year_check',
    'experiences_visited_month_check',
    'experiences_visited_pair_check'
  ] loop
    begin
      execute format('alter table public.experiences validate constraint %I', c);
    exception when others then
      raise notice 'ATENȚIE: % nu a putut fi validată: %', c, sqlerrm;
    end;
  end loop;
end $$;

-- căutările de tipul „ce a fost aici vara trecută" au de unde porni
create index if not exists experiences_visited_idx
  on public.experiences (visited_year desc, visited_month desc)
  where visited_year is not null;

-- ---------------------------------------------------------------------
-- publish_story(), cu perioada și cu coperta automată
--
-- Migrarea 33 aduce cover_source și apply_trip_auto_cover(); versiunea de
-- aici e cea definitivă a funcției, deci rulează 33 ÎNAINTE. Dacă ai
-- rulat deja 34, rulează-o din nou după 33 — e idempotentă.
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

  -- abia acum există opririle, deci lanțul de fallback are ce căuta
  perform public.apply_trip_auto_cover(v_trip_id);

  return jsonb_build_object(
    'trip_id', v_trip_id,
    'experience_id', v_first_exp,
    'experience_ids', to_jsonb(v_ids)
  );
end $$;

grant execute on function public.publish_story(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Verificare
-- ---------------------------------------------------------------------
do $$
declare
  r        record;
  v_numar  integer;
begin
  for r in
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences'
      and column_name in ('visited_year', 'visited_month')
    order by column_name
  loop
    raise notice '  % — %, nullable: %', rpad(r.column_name, 14), r.data_type, r.is_nullable;
  end loop;

  select count(*) into v_numar
  from pg_constraint
  where conrelid = 'public.experiences'::regclass
    and conname like 'experiences_visited%';

  raise notice 'Constrângeri pe perioadă: % din 3 așteptate.', v_numar;
end $$;
