-- =====================================================================
-- Pocoloco — Notarea devine opțională
--
-- Ecranul de creare nu mai cere stele: poți publica un loc cu o poză și
-- două rânduri, fără să-l notezi. Dar `rating_experience` era NOT NULL,
-- iar `experiences_rating_*_check` acceptă doar 1–5 — deci publicarea
-- fără notare pica.
--
-- Aici scoatem doar NOT NULL. Constrângerile CHECK rămân neatinse: un
-- NULL trece prin ele oricum (în SQL, `null between 1 and 5` e NULL, nu
-- fals, iar un CHECK respinge doar ce e explicit fals). Așa rămâne
-- imposibil să intre o notă de 0 sau de 7.
--
-- Coloanele rating_access și rating_crowd erau deja nullable.
--
-- Rulează DUPĂ 20260808_experience_kinds.sql.
-- =====================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences'
      and column_name = 'rating_experience' and is_nullable = 'NO'
  ) then
    alter table public.experiences alter column rating_experience drop not null;
    raise notice 'rating_experience nu mai e obligatoriu.';
  else
    raise notice 'rating_experience era deja opțional — nimic de făcut.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Verificare: cum arată acum cele trei coloane și ce checkuri le apără
-- ---------------------------------------------------------------------
do $$
declare
  r      record;
  linie  text;
begin
  for r in
    select column_name, is_nullable, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences'
      and column_name in ('rating_experience', 'rating_access', 'rating_crowd')
    order by column_name
  loop
    raise notice '  % — nullable: %', rpad(r.column_name, 18), r.is_nullable;
  end loop;

  for r in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.experiences'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%rating%'
  loop
    raise notice '  check % => %', r.conname, r.def;
  end loop;

  select string_agg(column_name, ', ') into linie
  from information_schema.columns
  where table_schema = 'public' and table_name = 'experiences'
    and column_name in ('rating_experience', 'rating_access', 'rating_crowd')
    and is_nullable = 'NO';

  if linie is not null then
    raise notice 'ATENȚIE: mai sunt ratinguri obligatorii: %', linie;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Test: o experiență fără nicio notă chiar intră?
--
-- Insertul se face într-un bloc cu EXCEPTION, adică într-o subtranzacție:
-- ridicăm intenționat o eroare la final, așa că se anulează tot, inclusiv
-- ce-ar fi apucat să facă triggerele (contoare, insigne). Nu rămâne nimic
-- în urmă, nici măcar un contor umflat cu unu.
-- ---------------------------------------------------------------------
do $$
declare
  v_user uuid;
  v_loc  uuid;
begin
  select id into v_user from public.profiles limit 1;
  select id into v_loc  from public.locations limit 1;

  if v_user is null or v_loc is null then
    raise notice 'TEST sărit: nu am găsit un user sau o locație de test.';
    return;
  end if;

  begin
    insert into public.experiences (
      kind, location_id, author_id, content, images, tips,
      rating_experience, rating_access, rating_crowd, status
    )
    values (
      'place_visit', v_loc, v_user, 'test ratinguri nule', '{}', '{}',
      null, null, null, 'draft'
    );

    -- singurul rol al erorii: să anuleze subtranzacția
    raise exception 'PocolocoTestOK';
  exception
    when others then
      if sqlerrm = 'PocolocoTestOK' then
        raise notice 'TEST OK: o experiență fără notare intră (rândul a fost anulat).';
      else
        raise notice 'TEST EȘUAT: %', sqlerrm;
      end if;
  end;
end $$;
