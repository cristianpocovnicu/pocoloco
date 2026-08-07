-- =====================================================================
-- Pocoloco — Geografie structurată pe locații + căutare cu diacritice
--
-- Două probleme, aceeași cauză: nu știam în ce regiune se află un loc.
--
--   1. Cine caută „madeira" caută insula, nu un rând din tabel. Azi
--      „Pico do Areeiro" n-are nimic în comun textual cu „Madeira", deci
--      nu apare.
--   2. `locations.city` e un lanț de fallback (locality → nivel 2 →
--      nivel 1), deci înseamnă lucruri diferite de la rând la rând: la un
--      vârf de munte ține regiunea, la un muzeu ține orașul.
--
-- Aici punem fiecare nivel în coloana lui. `city` rămâne neatins: e
-- folosit în ~15 locuri ca text de afișare și nu merită migrat acum.
--
-- Plus normalizarea pentru căutare: „bacau" trebuie să găsească „Bacău".
--
-- Rulează DUPĂ 020_20260807_location_photos.sql.
-- =====================================================================

-- extensiile stau în schema `extensions` pe Supabase, dar pot fi și în
-- `public` pe instalări mai vechi — căutăm în amândouă
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Coloanele
-- ---------------------------------------------------------------------
alter table public.locations add column if not exists locality     text;
alter table public.locations add column if not exists admin_area_1 text;
alter table public.locations add column if not exists admin_area_2 text;
alter table public.locations add column if not exists country_code text;

comment on column public.locations.locality     is 'Localitatea propriu-zisă (Google: locality)';
comment on column public.locations.admin_area_1 is 'Regiunea de nivel 1: Madeira, Brașov, Andaluzia';
comment on column public.locations.admin_area_2 is 'Nivelul 2, unde există — util și pentru județe';
comment on column public.locations.country_code is 'ISO din shortText, mai bun de grupat decât numele localizat';

-- ---------------------------------------------------------------------
-- 2. Extensii
-- ---------------------------------------------------------------------
do $$
begin
  create extension if not exists unaccent with schema extensions;
exception when others then
  -- unele instalări n-au schema `extensions`; atunci merge în cea curentă
  create extension if not exists unaccent;
end $$;

do $$
begin
  create extension if not exists pg_trgm with schema extensions;
exception when others then
  create extension if not exists pg_trgm;
end $$;

do $$
declare
  r record;
begin
  for r in
    select e.extname, n.nspname
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname in ('unaccent', 'pg_trgm')
  loop
    raise notice '  extensia % e în schema %', r.extname, r.nspname;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Normalizarea
--
--    `unaccent()` e STABLE, nu IMMUTABLE — depinde de un dicționar care
--    teoretic se poate schimba — deci n-are voie direct într-un index.
--    Ambalajul de mai jos e declarat IMMUTABLE, soluția documentată
--    pentru cazul ăsta: dicționarul `unaccent` nu se schimbă în practică,
--    iar dacă cineva chiar l-ar modifica, indexurile ar trebui
--    reconstruite (REINDEX).
--
--    Forma cu două argumente (regdictionary, text) e cea care poate fi
--    marcată immutable fără să depindă de search_path.
-- ---------------------------------------------------------------------
create or replace function public.search_normalize(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(unaccent('unaccent'::regdictionary, coalesce(p_text, '')));
$$;

grant execute on function public.search_normalize(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Indexuri trigram
--
--    Expresia din index trebuie să fie identică, caracter cu caracter, cu
--    cea din WHERE — de asta interogările din aplicație cheamă tot
--    public.search_normalize(coloana).
--
--    GIN + gin_trgm_ops acoperă LIKE '%text%', dar doar de la 3 caractere
--    în sus (sub atât nu există trigrame); termenii mai scurți cad pe
--    scanare, ceea ce e în regulă la volumul nostru.
-- ---------------------------------------------------------------------
create index if not exists locations_name_trgm_idx
  on public.locations using gin (public.search_normalize(name) gin_trgm_ops);

create index if not exists locations_locality_trgm_idx
  on public.locations using gin (public.search_normalize(locality) gin_trgm_ops);

create index if not exists locations_area1_trgm_idx
  on public.locations using gin (public.search_normalize(admin_area_1) gin_trgm_ops);

create index if not exists locations_area2_trgm_idx
  on public.locations using gin (public.search_normalize(admin_area_2) gin_trgm_ops);

create index if not exists locations_country_trgm_idx
  on public.locations using gin (public.search_normalize(country) gin_trgm_ops);

create index if not exists trips_title_trgm_idx
  on public.trips using gin (public.search_normalize(title) gin_trgm_ops);

create index if not exists experiences_title_trgm_idx
  on public.experiences using gin (public.search_normalize(title) gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 5. Căutarea
--
--    Prin RPC, nu din PostgREST: filtrul trebuie să fie exact expresia
--    indexată, iar `?name=ilike.*x*` ar fi lucrat pe coloana brută, fără
--    normalizare. Funcțiile sunt SECURITY INVOKER (implicit), deci RLS
--    se aplică normal — un vizitator vede tot ce vedea și înainte.
-- ---------------------------------------------------------------------

/**
 * Locuri după nume SAU după geografie: „madeira" întoarce și locul
 * Madeira, și tot ce e în regiune.
 *
 * Ordinea: potrivirile pe nume primele — cine caută „Funchal" vrea
 * Funchal-ul, nu toată insula.
 */
create or replace function public.search_locations(
  p_term      text default '',
  p_category  text default null,
  p_min_score numeric default 0,
  p_limit     integer default 30
)
returns setof public.locations
language sql
stable
set search_path = public, extensions
as $$
  select l.*
  from public.locations l
  where l.status = 'approved'
    and (p_category is null or l.category = p_category)
    and (coalesce(p_min_score, 0) = 0 or l.score >= p_min_score)
    and (
      coalesce(btrim(p_term), '') = ''
      or public.search_normalize(l.name)         like '%' || public.search_normalize(p_term) || '%'
      or public.search_normalize(l.locality)     like '%' || public.search_normalize(p_term) || '%'
      or public.search_normalize(l.admin_area_1) like '%' || public.search_normalize(p_term) || '%'
      or public.search_normalize(l.admin_area_2) like '%' || public.search_normalize(p_term) || '%'
      or public.search_normalize(l.country)      like '%' || public.search_normalize(p_term) || '%'
    )
  order by
    case
      when coalesce(btrim(p_term), '') = '' then 1
      when public.search_normalize(l.name) like '%' || public.search_normalize(p_term) || '%' then 0
      else 1
    end,
    l.experience_count desc nulls last,
    l.name
  limit greatest(coalesce(p_limit, 30), 1);
$$;

/** Călătorii după titlu, cu diacriticele ignorate. */
create or replace function public.search_trips(
  p_term  text default '',
  p_sort  text default 'popular',
  p_limit integer default 20
)
returns setof public.trips
language sql
stable
set search_path = public, extensions
as $$
  select t.*
  from public.trips t
  where t.status = 'active'
    and (
      coalesce(btrim(p_term), '') = ''
      or public.search_normalize(t.title) like '%' || public.search_normalize(p_term) || '%'
    )
  order by
    case when p_sort = 'popular' then 0 else 1 end,
    case when p_sort = 'popular' then t.is_guide end desc nulls last,
    case when p_sort = 'popular' then t.save_count end desc nulls last,
    t.created_at desc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

/** Activități după titlu, cu diacriticele ignorate. */
create or replace function public.search_activities(
  p_term  text default '',
  p_limit integer default 30
)
returns setof public.experiences
language sql
stable
set search_path = public, extensions
as $$
  select e.*
  from public.experiences e
  where e.kind = 'activity'
    and e.status = 'active'
    and (
      coalesce(btrim(p_term), '') = ''
      or public.search_normalize(e.title) like '%' || public.search_normalize(p_term) || '%'
    )
  order by e.created_at desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

grant execute on function public.search_locations(text, text, numeric, integer)  to anon, authenticated;
grant execute on function public.search_trips(text, text, integer)               to anon, authenticated;
grant execute on function public.search_activities(text, integer)                to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Verificare
-- ---------------------------------------------------------------------
do $$
declare
  v_total    integer;
  v_cu_area  integer;
  v_indexuri integer;
begin
  select count(*), count(admin_area_1) into v_total, v_cu_area from public.locations;

  select count(*) into v_indexuri
  from pg_indexes
  where schemaname = 'public' and indexname like '%_trgm_idx';

  raise notice 'Locații: % total, % cu regiune completată (backfill-ul se face din /admin/locations).', v_total, v_cu_area;
  raise notice 'Indexuri trigram create: %.', v_indexuri;
  raise notice 'Test: search_normalize(''Bacău'') = %', public.search_normalize('Bacău');
end $$;
