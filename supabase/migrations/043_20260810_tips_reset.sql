-- =====================================================================
-- Pocoloco — Ponturile vechi, remapate
--
-- Setul de chips-uri s-a schimbat (august 2026): a scăpat de evaluările
-- deghizate în fapte („Merită prețul", „Peisaj spectaculos") și de cele
-- care spuneau ceva despre gust, nu despre loc. Dar ponturile alese
-- înainte sunt text în `experiences.tips`, deci rămân acolo până le
-- atinge cineva.
--
-- De ce migrare și nu un script din client: sunt date, nu afișare. Un
-- „Merită prețul" rămas în bază ar ieși mâine într-un export, într-o
-- căutare full-text sau în setul din care extragem lista finală. Se
-- repară o dată, la sursă.
--
-- Maparea:
--   Mergi dimineața     -> neschimbat
--   Parcare ușoară      -> neschimbat
--   Gratuit             -> neschimbat
--   Accesibil cu copii  -> Bun cu copii
--   Rezervă online      -> Rezervă din timp
--   Aglomerat weekend   -> Evită weekendul
--   Merită prețul       -> șters (evaluare)
--   Bun pentru familie  -> șters (evaluare)
--   Peisaj spectaculos  -> șters (interzis prin spec-ul de conținut)
--
-- Formele fără diacritice sunt tratate la fel: n-avem cum ști cu ce
-- tastatură a fost scrisă baza înainte.
--
-- Idempotentă: rulată a doua oară nu mai găsește nimic de schimbat.
-- Rulează oricând după 032_20260808_publish_story_array_guard.sql.
-- =====================================================================

do $$
declare
  v_de_atins integer;
  v_atinse   integer;
begin
  create temp table mapare_ponturi (vechi text primary key, nou text) on commit drop;

  insert into mapare_ponturi (vechi, nou) values
    ('Mergi dimineața',    'Mergi dimineața'),
    ('Mergi dimineata',    'Mergi dimineața'),
    ('Parcare ușoară',     'Parcare ușoară'),
    ('Parcare usoara',     'Parcare ușoară'),
    ('Gratuit',            'Gratuit'),
    ('Accesibil cu copii', 'Bun cu copii'),
    ('Rezervă online',     'Rezervă din timp'),
    ('Rezerva online',     'Rezervă din timp'),
    ('Aglomerat weekend',  'Evită weekendul'),
    -- nou = null înseamnă „scoate-l"
    ('Merită prețul',      null),
    ('Merita pretul',      null),
    ('Bun pentru familie', null),
    ('Peisaj spectaculos', null);

  select count(*) into v_de_atins
  from public.experiences e
  where exists (
    select 1
    from unnest(coalesce(e.tips, '{}'::text[])) as t(tip)
    join mapare_ponturi m on m.vechi = t.tip
    where m.nou is null or m.nou <> t.tip
  );

  -- Ponturile scrise de mână (dacă apar vreodată) nu sunt în mapare și
  -- trec neatinse: `left join` + `coalesce` le lasă cum sunt.
  with recalculat as (
    select
      e.id,
      coalesce(
        array_agg(distinct coalesce(m.nou, t.tip))
          filter (where m.vechi is null or m.nou is not null),
        '{}'::text[]
      ) as tips_noi
    from public.experiences e
    cross join lateral unnest(coalesce(e.tips, '{}'::text[])) as t(tip)
    left join mapare_ponturi m on m.vechi = t.tip
    group by e.id
  )
  update public.experiences e
  set tips = r.tips_noi
  from recalculat r
  where e.id = r.id
    and e.tips is distinct from r.tips_noi;

  get diagnostics v_atinse = row_count;

  raise notice 'Ponturi: % experiențe aveau valori vechi, % au fost rescrise.', v_de_atins, v_atinse;
end $$;

-- ---------------------------------------------------------------------
-- Verificare: n-a rămas niciun pont din setul retras
-- ---------------------------------------------------------------------
do $$
declare
  v_ramase integer;
begin
  select count(*) into v_ramase
  from public.experiences e
  where coalesce(e.tips, '{}'::text[]) && array[
    'Merită prețul', 'Merita pretul', 'Bun pentru familie', 'Peisaj spectaculos',
    'Accesibil cu copii', 'Rezervă online', 'Rezerva online', 'Aglomerat weekend'
  ];

  if v_ramase = 0 then
    raise notice 'Niciun pont din setul vechi nu a mai rămas în date.';
  else
    raise warning '% experiențe încă au ponturi vechi — verifică maparea.', v_ramase;
  end if;
end $$;
