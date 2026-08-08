-- =====================================================================
-- Pocoloco — Cine a povestit un loc a fost acolo
--
-- Harta din profil se umple din `saves` cu status 'visited'. Dar bifa se
-- cerea separat, ca acțiune de sine stătătoare — așa că exact oamenii
-- care scriau povești aveau harta goală: publicaseră despre zece locuri
-- și nu bifaseră niciunul.
--
-- De aici: o experiență publicată despre un loc marchează locul ca
-- vizitat, pentru autorul ei.
--
-- Regula stă în bază, nu în client, din același motiv ca la contorul de
-- experiențe (migrarea 41): sunt două căi de publicare azi — insertul
-- direct pentru o singură experiență și `publish_story()` pentru restul —
-- și vor mai fi. Un trigger le acoperă pe toate, inclusiv pe cele care
-- nu s-au scris încă.
--
-- SECURITY DEFINER, tot lecția migrării 41: fără el, RLS ar bloca
-- inserarea în `saves` ori de câte ori politica nu se potrivește, tăcut,
-- fără nicio eroare.
--
-- Rulează DUPĂ 022_20260807_points_2_triggers.sql și 027_20260808_experience_kinds.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Triggerul
--
-- Indexul unic din migrarea 8 e parțial — `(user_id, location_id) where
-- location_id is not null` — deci `on conflict` trebuie să repete
-- predicatul, altfel Postgres nu-l poate deduce.
--
-- `do update ... where saves.status <> 'visited'` face două lucruri: mută
-- rândul din „vreau să merg" în „am fost", și nu atinge deloc rândurile
-- deja vizitate. Un update care nu schimbă nimic ar fi declanșat inutil
-- triggerul de puncte.
-- ---------------------------------------------------------------------
create or replace function public.mark_visited_after_experience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- o activitate n-are pin: n-are ce marca
  if new.location_id is null then return null; end if;
  if coalesce(new.kind, 'place_visit') <> 'place_visit' then return null; end if;
  if new.status <> 'active' then return null; end if;
  if new.author_id is null then return null; end if;

  -- la UPDATE marcăm doar ce tocmai a devenit public sau și-a schimbat
  -- locul; o editare de text nu e o vizită nouă
  if tg_op = 'UPDATE'
     and old.status = 'active'
     and old.location_id is not distinct from new.location_id then
    return null;
  end if;

  insert into public.saves (user_id, location_id, status)
  values (new.author_id, new.location_id, 'visited')
  on conflict (user_id, location_id) where location_id is not null
  do update set status = 'visited'
  where public.saves.status <> 'visited';

  return null;
exception when others then
  -- ca la puncte: marcajul nu are voie să strice publicarea
  raise notice 'mark_visited_after_experience: %', sqlerrm;
  return null;
end $$;

drop trigger if exists mark_visited_after_experience_trg on public.experiences;
create trigger mark_visited_after_experience_trg
  after insert or update on public.experiences
  for each row execute function public.mark_visited_after_experience();

-- ---------------------------------------------------------------------
-- 2. Backfill
--
-- Punctele curg pe drumul obișnuit: inserturile de mai jos declanșează
-- `points_save_trg` (migrarea 22), care cheamă `award_points()`. E
-- aceeași alegere ca la migrarea 26 — istoria își primește punctele, nu
-- e pedepsită pentru că s-a întâmplat înaintea regulii — iar cheia unică
-- din `points_ledger` oprește orice dublare pentru cine avea deja rândul.
--
-- O diferență față de 26, asumată: acolo rândurile din registru păstrau
-- data originală, aici primesc `now()`. Ca să păstrăm datele vechi ar
-- trebui să scriem noi în registru, ocolind `award_points()` și
-- duplicându-i regulile (rata redusă pentru conturi noi). Nu merită:
-- punctele sunt aceleași, doar ziua din istoric diferă.
-- ---------------------------------------------------------------------
do $$
declare
  v_de_creat integer;
  v_de_mutat integer;
  v_atinse   integer;
begin
  with candidati as (
    select distinct e.author_id as user_id, e.location_id
    from public.experiences e
    where e.status = 'active'
      and e.location_id is not null
      and e.author_id is not null
      and coalesce(e.kind, 'place_visit') = 'place_visit'
  )
  select
    count(*) filter (where s.user_id is null),
    count(*) filter (where s.status = 'want_to_go')
  into v_de_creat, v_de_mutat
  from candidati c
  left join public.saves s
    on s.user_id = c.user_id and s.location_id = c.location_id;

  with candidati as (
    select distinct e.author_id as user_id, e.location_id
    from public.experiences e
    where e.status = 'active'
      and e.location_id is not null
      and e.author_id is not null
      and coalesce(e.kind, 'place_visit') = 'place_visit'
  )
  insert into public.saves (user_id, location_id, status)
  select c.user_id, c.location_id, 'visited'
  from candidati c
  on conflict (user_id, location_id) where location_id is not null
  do update set status = 'visited'
  where public.saves.status <> 'visited';

  get diagnostics v_atinse = row_count;

  raise notice 'Am fost: % rânduri create, % mutate din „vreau să merg" (% atinse în total).',
    v_de_creat, v_de_mutat, v_atinse;
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
    select distinct e.author_id as user_id, e.location_id
    from public.experiences e
    where e.status = 'active'
      and e.location_id is not null
      and e.author_id is not null
      and coalesce(e.kind, 'place_visit') = 'place_visit'
  ) c
  left join public.saves s
    on s.user_id = c.user_id and s.location_id = c.location_id and s.status = 'visited'
  where s.user_id is null;

  if v_lipsa = 0 then
    raise notice 'Toate experiențele active despre un loc au acum „am fost" pentru autorul lor.';
  else
    raise warning '% perechi autor+loc au rămas nemarcate — verifică RLS și constrângerile pe saves.', v_lipsa;
  end if;
end $$;
