-- =====================================================================
-- Pocoloco — Experiențe de loc și experiențe de activitate
--
-- Până acum o experiență era mereu legată de un loc de pe hartă. Dar
-- jumătate din ce-și amintește lumea dintr-o vacanță nu e un loc: e o
-- tură cu buggy, o scufundare, un curs de gătit. Astea n-au pin și nu
-- merită unul.
--
-- De aici, `experiences.kind` spune despre ce e vorba:
--   'place_visit' — cum era până acum: location_id obligatoriu
--   'activity'    — title obligatoriu, location_id opțional
--
-- Regresie zero pentru rândurile existente: toate primesc
-- kind = 'place_visit', iar constrângerea le acceptă ca atare.
--
-- AUDIT înainte de rulare — ce depinde de location_id NOT NULL:
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--   where tgrelid = 'public.experiences'::regclass and not tgisinternal;
-- Un trigger care face `update locations ... where id = new.location_id`
-- devine no-op când location_id e null (nu actualizează niciun rând),
-- deci contorul experience_count rămâne corect fără nicio modificare.
-- Dacă ai unul care presupune că locația există (select ... into strict),
-- trebuie ajustat manual.
--
-- Rulează DUPĂ 002_20260806_location_approval.sql.
-- Următoarea: 028_20260808_trip_activity_stops.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coloanele noi
-- ---------------------------------------------------------------------
alter table public.experiences add column if not exists kind              text not null default 'place_visit';
alter table public.experiences add column if not exists title             text;
alter table public.experiences add column if not exists activity_category text;
alter table public.experiences add column if not exists activity_area     text;

-- rândurile vechi sunt, prin definiție, vizite la un loc
update public.experiences set kind = 'place_visit' where kind is null or kind = '';

-- ---------------------------------------------------------------------
-- 2. location_id devine opțional
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences'
      and column_name = 'location_id' and is_nullable = 'NO'
  ) then
    alter table public.experiences alter column location_id drop not null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Constrângeri
--
--    Le adăugăm ca NOT VALID întâi, apoi le validăm: dacă baza are un
--    rând care nu se potrivește, primim eroarea la validare și tabelul
--    rămâne funcțional între timp.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'experiences_kind_check') then
    alter table public.experiences
      add constraint experiences_kind_check
      check (kind in ('place_visit', 'activity'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experiences_activity_category_check') then
    alter table public.experiences
      add constraint experiences_activity_category_check
      check (activity_category is null or activity_category in (
        'adrenalina', 'pe_apa', 'natura', 'gastronomie',
        'cultura', 'distractie', 'wellness', 'altele'
      ));
  end if;

  -- o vizită are loc, o activitate are titlu
  if not exists (select 1 from pg_constraint where conname = 'experiences_kind_target_check') then
    alter table public.experiences
      add constraint experiences_kind_target_check
      check (
        (kind = 'place_visit' and location_id is not null)
        or (kind = 'activity' and title is not null and btrim(title) <> '')
      )
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.experiences validate constraint experiences_kind_target_check;
exception when others then
  raise notice 'ATENȚIE: experiences_kind_target_check nu a putut fi validată: %. Caută rândurile problemă cu: select id, kind, location_id, title from public.experiences where (kind = ''place_visit'' and location_id is null) or (kind = ''activity'' and coalesce(btrim(title), '''') = '''');', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 4. Indexuri — feedul cere „activitățile", profilul le cere pe amândouă
-- ---------------------------------------------------------------------
create index if not exists experiences_kind_idx on public.experiences (kind, created_at desc);
create index if not exists experiences_activity_category_idx
  on public.experiences (activity_category) where activity_category is not null;

-- ---------------------------------------------------------------------
-- 5. Punctele: bonusul de +3 pentru „ai legat-o de un loc" se acordă și
--    activităților care spun măcar zona. Restul rămâne neschimbat.
-- ---------------------------------------------------------------------
create or replace function public.points_after_experience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := 10;
  v_parts  text[]  := array['bază'];
  v_images integer;
  v_tips   integer;
begin
  if new.status is distinct from 'active' then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    -- era deja publicată: punctele s-au dat atunci
    if old.status = 'active' then
      return null;
    end if;
  end if;

  -- to_jsonb ne scapă de presupuneri despre tipul coloanei (text[] sau jsonb)
  v_images := jsonb_array_length(coalesce(to_jsonb(new.images), '[]'::jsonb));
  v_tips   := jsonb_array_length(coalesce(to_jsonb(new.tips),   '[]'::jsonb));

  -- „unde s-a întâmplat": un loc de pe hartă sau, la activități, zona
  if new.location_id is not null
     or coalesce(btrim(new.activity_area), '') <> '' then
    v_points := v_points + 3; v_parts := v_parts || 'locație';
  end if;
  -- bonus fix, nu per imagine: 1 poză și 50 de poze valorează la fel
  if v_images > 0 then
    v_points := v_points + 4; v_parts := v_parts || 'imagini';
  end if;
  if coalesce(btrim(new.content), '') <> '' then
    v_points := v_points + 3; v_parts := v_parts || 'text';
  end if;
  if v_tips > 0 then
    v_points := v_points + 5; v_parts := v_parts || 'ponturi';
  end if;
  if coalesce(new.rating_experience, 0) > 0 then
    v_points := v_points + 2; v_parts := v_parts || 'notare';
  end if;

  perform public.award_points(
    new.author_id, null, 'experience_posted', 'experience', new.id, v_points,
    jsonb_build_object('parts', v_parts)
  );
  return null;
exception when others then
  raise notice 'points_after_experience(%): %', new.id, sqlerrm;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 6. Ce triggere sunt pe experiences, ca să le poți verifica singur
-- ---------------------------------------------------------------------
do $$
declare
  lista text;
begin
  select string_agg(tgname, ', ') into lista
  from pg_trigger
  where tgrelid = 'public.experiences'::regclass and not tgisinternal;

  raise notice 'Triggere pe experiences: %. Verifică-le pe cele care ating locations: cu location_id null devin no-op.', coalesce(lista, 'niciunul');
end $$;
