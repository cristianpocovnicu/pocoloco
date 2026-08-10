-- =====================================================================
-- Pocoloco — Și opririle fără poveste sunt locuri în care ai fost
--
-- Migrarea 42 a legat harta din profil de publicare: cine scrie o
-- experiență despre un loc primește „am fost" acolo. A rămas însă
-- descoperită jumătatea cealaltă a unei călătorii — opririle care n-au
-- primit niciodată o experiență.
--
-- Fluxul le produce în mod normal: la publicare, o oprire devine
-- experiență doar dacă are `create_experience` (sau e activitate). Un loc
-- prin care ai trecut, l-ai pus pe traseu și n-ai avut ce scrie despre el
-- intră în `trip_locations` cu `location_id` completat și `experience_id`
-- null. Omul a fost acolo la fel de real ca în locul despre care a scris
-- trei paragrafe — dar pe hartă nu apărea.
--
-- ORDINEA, verificată în publish_story (migrarea 38) înainte de a alege
-- unde stă logica: funcția inserează întâi `trips` cu `status = 'active'`
-- direct (secțiunea 4), și abia apoi, în bucla de sub ea, opririle. La fel
-- fac și celelalte două căi din client — „Adaugă la o ieșire" creează
-- călătoria activă și pune oprirea după, iar editarea itinerarului
-- lucrează pe o călătorie care există deja. **Nu există drum
-- draft → activă pentru călătorii**, deci un trigger pe `trip_locations`
-- găsește întotdeauna părintele activ. Condiția rămâne strictă, fără
-- relaxări și fără un al doilea trigger pe `trips`.
--
-- SECURITY DEFINER, aceeași lecție ca la 41 și 42: fără el, RLS ar
-- refuza tăcut inserarea în `saves`.
--
-- Rulează DUPĂ 042_20260810_visited_on_publish.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Triggerul
--
-- Autorul nu e pe rând: `trip_locations` nu știe al cui e drumul, deci
-- se ia din `trips` printr-un join. De acolo vine și condiția de
-- activitate a călătoriei.
--
-- Nu filtrăm după `experience_id is null`, deși ăsta e cazul care
-- lipsea. O oprire poate avea și loc, și experiență (publish_story le
-- scrie pe amândouă când oprirea a primit o poveste) — iar pentru aceea
-- triggerul din 42 a marcat deja. Al doilea marcaj nu strică nimic:
-- `where saves.status <> 'visited'` îl face un no-op, fără update și
-- fără puncte în plus. Mai bine o regulă simplă și idempotentă decât una
-- cu o condiție de care depinde corectitudinea.
--
-- Doar la INSERT. Editarea itinerarului schimbă `day_number`, `note` și
-- `position` — niciodată `location_id` —, deci nu există un update prin
-- care o oprire să ajungă la alt loc.
--
-- ȘTERGEREA NU RETRAGE „am fost". Scoți o oprire dintr-o călătorie
-- pentru că restructurezi traseul, nu pentru că n-ai mai fost acolo.
-- Harta e un jurnal, nu o oglindă a itinerarelor: odată bifat, locul
-- rămâne bifat până îl scoate omul cu mâna lui, de pe pagina locului.
-- ---------------------------------------------------------------------
create or replace function public.mark_visited_after_trip_stop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  -- o oprire care e doar activitate n-are pin: n-are ce marca
  if new.location_id is null then return null; end if;

  select t.author_id into v_author
  from public.trips t
  where t.id = new.trip_id
    and t.status = 'active';

  if v_author is null then return null; end if;

  -- indexul unic e parțial (migrarea 8), deci `on conflict` îi repetă
  -- predicatul; altfel Postgres nu-l poate deduce
  insert into public.saves (user_id, location_id, status)
  values (v_author, new.location_id, 'visited')
  on conflict (user_id, location_id) where location_id is not null
  do update set status = 'visited'
  where public.saves.status <> 'visited';

  return null;
exception when others then
  -- ca la puncte și ca la 42: marcajul n-are voie să strice publicarea
  raise notice 'mark_visited_after_trip_stop: %', sqlerrm;
  return null;
end $$;

drop trigger if exists mark_visited_after_trip_stop_trg on public.trip_locations;
create trigger mark_visited_after_trip_stop_trg
  after insert on public.trip_locations
  for each row execute function public.mark_visited_after_trip_stop();

-- ---------------------------------------------------------------------
-- 2. Backfill
--
-- Aceleași reguli ca la 42: punctele curg pe drumul obișnuit, prin
-- `points_save_trg` → `award_points()`, iar cheia unică din
-- `points_ledger` oprește dublarea pentru cine avea deja rândul. Istoria
-- își primește punctele; ce diferă față de migrarea 26 e doar ziua din
-- registru, care va fi `now()`.
--
-- `distinct` contează dublu aici: același loc poate apărea de mai multe
-- ori în aceeași călătorie (ai trecut prin el la dus și la întors) și în
-- mai multe călătorii ale aceluiași om.
-- ---------------------------------------------------------------------
do $$
declare
  v_de_creat integer;
  v_de_mutat integer;
  v_atinse   integer;
begin
  with candidati as (
    select distinct t.author_id as user_id, tl.location_id
    from public.trip_locations tl
    join public.trips t on t.id = tl.trip_id
    where tl.location_id is not null
      and t.status = 'active'
      and t.author_id is not null
  )
  select
    count(*) filter (where s.user_id is null),
    count(*) filter (where s.status = 'want_to_go')
  into v_de_creat, v_de_mutat
  from candidati c
  left join public.saves s
    on s.user_id = c.user_id and s.location_id = c.location_id;

  with candidati as (
    select distinct t.author_id as user_id, tl.location_id
    from public.trip_locations tl
    join public.trips t on t.id = tl.trip_id
    where tl.location_id is not null
      and t.status = 'active'
      and t.author_id is not null
  )
  insert into public.saves (user_id, location_id, status)
  select c.user_id, c.location_id, 'visited'
  from candidati c
  on conflict (user_id, location_id) where location_id is not null
  do update set status = 'visited'
  where public.saves.status <> 'visited';

  get diagnostics v_atinse = row_count;

  raise notice 'Opriri de călătorie: % rânduri „am fost" create, % mutate din „vreau să merg" (% atinse în total).',
    v_de_creat, v_de_mutat, v_atinse;
  raise notice 'Restul perechilor autor+loc erau deja marcate — de obicei de migrarea 42, pentru opririle care au și experiență.';
end $$;

-- ---------------------------------------------------------------------
-- 3. Verificare
-- ---------------------------------------------------------------------
do $$
declare
  v_lipsa integer;
begin
  select count(*) into v_lipsa
  from (
    select distinct t.author_id as user_id, tl.location_id
    from public.trip_locations tl
    join public.trips t on t.id = tl.trip_id
    where tl.location_id is not null
      and t.status = 'active'
      and t.author_id is not null
  ) c
  left join public.saves s
    on s.user_id = c.user_id and s.location_id = c.location_id and s.status = 'visited'
  where s.user_id is null;

  if v_lipsa = 0 then
    raise notice 'Toate opririle cu loc din călătoriile active au acum „am fost" pentru autorul lor.';
  else
    raise warning '% perechi autor+loc au rămas nemarcate — verifică RLS și constrângerile pe saves.', v_lipsa;
  end if;
end $$;
