-- =====================================================================
-- Pocoloco — Economia de puncte (1/6): nucleul
--
-- Un singur registru, `points_ledger`, în care fiecare rând spune „cine
-- a făcut ce, cui, și cât face". Totalul de pe profil e derivat din el,
-- nu ținut de mână — deci nu poate ieși din sinc.
--
-- Cine primește punctele dintr-un rând: coalesce(recipient_id, actor_id).
--   - actor_id = cine a făcut acțiunea
--   - recipient_id = autorul conținutului, când acțiunea îl răsplătește
-- O interacțiune cu recompensă dublă („cineva mi-a salvat călătoria")
-- scrie două rânduri: unul pentru actor, unul pentru autor.
--
-- Deduplicarea anti-abuse stă în schemă, nu în cod: indexul unic de mai
-- jos face ca a doua încercare de a plăti aceeași acțiune să nu facă
-- nimic. Unfollow + follow din nou, unsave + save din nou: zero puncte.
--
-- Rulează DUPĂ migrările pentru experiences / trips / follows / saves.
-- Următoarea: 20260807_points_2_triggers.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coloanele de pe profil
--    Nume noi, distincte de `xp` și `guide_level` din schema veche —
--    acelea rămân neatinse.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists points_total integer not null default 0;
alter table public.profiles add column if not exists points_level integer not null default 1;

create index if not exists profiles_points_idx on public.profiles (points_total desc);

-- ---------------------------------------------------------------------
-- 2. Curba de nivel, ca date — ca UI-ul să nu redefinească pragurile
-- ---------------------------------------------------------------------
create table if not exists public.point_levels (
  level      integer primary key,
  min_points integer not null,
  name       text    not null,
  unlock     text
);

insert into public.point_levels (level, min_points, name, unlock) values
  ( 1,     0, 'Turist Nou',      'Profil de bază'),
  ( 2,    40, 'Explorator',      'Ramă de avatar'),
  ( 3,   100, 'Călător',         null),
  ( 4,   200, 'Călător',         'Culoare de insignă'),
  ( 5,   350, 'Aventurier',      'Insigna „Contributor remarcat”'),
  ( 6,   550, 'Aventurier',      null),
  ( 7,   750, 'Aventurier',      'Colecții din conținutul salvat'),
  ( 8,  1000, 'Navigator',       null),
  ( 9,  1250, 'Navigator',       null),
  (10,  1500, 'Navigator',       'Temă de profil'),
  (11,  2000, 'Navigator',       null),
  (12,  2500, 'Ghid',            null),
  (13,  2850, 'Ghid',            null),
  (14,  3150, 'Ghid',            null),
  (15,  3500, 'Ghid Local',      'Acces devreme la funcții noi'),
  (16,  4200, 'Ghid Local',      null),
  (17,  4900, 'Ghid Local',      null),
  (18,  5600, 'Ghid Local',      null),
  (19,  6300, 'Ghid Local',      null),
  (20,  7000, 'Maestru Călător', 'Pagina contributorilor')
on conflict (level) do update set
  min_points = excluded.min_points,
  name       = excluded.name,
  unlock     = excluded.unlock;

-- Nivelul 20 e ultimul din tabel: peste 7.000 de puncte rămâi Maestru
-- Călător până extindem curba. Deblocările sunt deocamdată doar text —
-- niciuna nu blochează funcții de bază (postare, salvare, urmărire).
create or replace function public.level_for_points(p_points integer)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(max(level), 1)
  from public.point_levels
  where min_points <= greatest(coalesce(p_points, 0), 0);
$$;

-- Varianta pe bigint: sum() întoarce bigint, iar Postgres nu convertește
-- singur argumentul în jos, spre integer. Fără ea, orice apel de forma
-- level_for_points(sum(...)) se oprește cu „function does not exist".
--
-- drop înainte de create, nu „create or replace": pe instalările unde
-- funcția a fost adăugată manual, parametrul se poate numi altfel, iar
-- replace nu are voie să redenumească parametri.
drop function if exists public.level_for_points(bigint);

create function public.level_for_points(p_points bigint)
returns integer
language sql
stable
set search_path = public
as $$
  select public.level_for_points(least(greatest(coalesce(p_points, 0), 0), 2147483647)::integer);
$$;

-- ---------------------------------------------------------------------
-- 3. Registrul
-- ---------------------------------------------------------------------
create table if not exists public.points_ledger (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete cascade,
  action_type  text not null,
  content_type text,
  content_id   uuid,
  meta         jsonb,
  points       integer not null,
  created_at   timestamptz not null default now()
);

-- Cheia anti-abuse. NULL nu se compară cu NULL într-un index unic, de
-- asta trecem totul prin coalesce. `meta->>'dedup_key'` lasă acțiunile
-- care se pot repeta periodic (share-ul, o dată pe zi) să-și pună singure
-- felia de timp în cheie.
create unique index if not exists points_ledger_dedup_idx
  on public.points_ledger (
    actor_id,
    action_type,
    coalesce(content_type, ''),
    coalesce(content_id::text, ''),
    coalesce(recipient_id::text, ''),
    coalesce(meta ->> 'dedup_key', '')
  );

-- istoricul din /points: cine a primit punctele, cele mai noi întâi
create index if not exists points_ledger_beneficiary_idx
  on public.points_ledger ((coalesce(recipient_id, actor_id)), created_at desc);

create index if not exists points_ledger_content_idx
  on public.points_ledger (content_type, content_id);

-- ---------------------------------------------------------------------
-- 4. Totalul de pe profil, derivat din registru
-- ---------------------------------------------------------------------
create or replace function public.recalc_points_total(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if p_user_id is null then return; end if;

  -- ::integer explicit: sum() e bigint, iar v_total e integer
  select coalesce(sum(points), 0)::integer into v_total
  from public.points_ledger
  where coalesce(recipient_id, actor_id) = p_user_id;

  update public.profiles
     set points_total = v_total,
         points_level = public.level_for_points(v_total)
   where id = p_user_id;
end $$;

create or replace function public.points_sync_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- registrul e append-only în practică; tratăm totuși ștergerea, ca
  -- rularea din nou a backfill-ului să nu lase totaluri umflate
  if tg_op = 'INSERT' then
    perform public.recalc_points_total(coalesce(new.recipient_id, new.actor_id));
  elsif tg_op = 'DELETE' then
    perform public.recalc_points_total(coalesce(old.recipient_id, old.actor_id));
  else
    perform public.recalc_points_total(coalesce(new.recipient_id, new.actor_id));
    if coalesce(old.recipient_id, old.actor_id) is distinct from coalesce(new.recipient_id, new.actor_id) then
      perform public.recalc_points_total(coalesce(old.recipient_id, old.actor_id));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists points_sync_total_trg on public.points_ledger;
create trigger points_sync_total_trg
  after insert or update or delete on public.points_ledger
  for each row execute function public.points_sync_total();

-- ---------------------------------------------------------------------
-- 5. Funcția centrală
--
--    Nu e expusă clientului: o cheamă doar triggerele și funcțiile
--    `security definer` de mai jos. Altfel oricine ar putea cere câte
--    puncte vrea.
-- ---------------------------------------------------------------------
create or replace function public.award_points(
  p_actor        uuid,
  p_recipient    uuid,
  p_action       text,
  p_content_type text,
  p_content_id   uuid,
  p_points       integer,
  p_meta         jsonb default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points  integer := p_points;
  v_joined  timestamptz;
  v_ready   boolean;
  v_rows    integer;
begin
  if p_actor is null or coalesce(p_points, 0) <= 0 then
    return 0;
  end if;

  -- interacțiunile cu propriul conținut nu se plătesc
  if p_recipient is not null and p_recipient = p_actor then
    return 0;
  end if;

  -- Rata redusă pentru conturi noi: jumătate până la 7 zile SAU până
  -- când contul arată a om real (profil completat + o experiență).
  -- Se aplică doar punctelor actorului; ce primește autorul unui
  -- conținut nu depinde de vârsta celui care a interacționat.
  if p_recipient is null then
    select p.created_at,
           (p.bio is not null and p.bio <> '' and p.avatar_url is not null)
             and exists (
               select 1 from public.experiences e
               where e.author_id = p_actor and e.status = 'active'
             )
      into v_joined, v_ready
    from public.profiles p
    where p.id = p_actor;

    if v_joined is not null
       and v_joined > now() - interval '7 days'
       and not coalesce(v_ready, false) then
      -- acțiunile de 1 punct rămân la 1: altfel ar părea că nu s-a întâmplat nimic
      v_points := greatest(floor(v_points / 2.0)::integer, 1);
    end if;
  end if;

  insert into public.points_ledger (
    actor_id, recipient_id, action_type, content_type, content_id, points, meta
  )
  values (p_actor, p_recipient, p_action, p_content_type, p_content_id, v_points, p_meta)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then v_points else 0 end;
exception
  when others then
    -- punctele nu au voie să strice acțiunea care le-a generat
    raise notice 'award_points(%, %): %', p_actor, p_action, sqlerrm;
    return 0;
end $$;

/**
 * Recompensa dublă: actorul primește puțin, autorul conținutului primește
 * partea mare. Ambele rânduri au aceeași cheie de acțiune, deci se
 * deduplică independent.
 */
create or replace function public.award_interaction(
  p_actor            uuid,
  p_author           uuid,
  p_action           text,
  p_content_type     text,
  p_content_id       uuid,
  p_actor_points     integer,
  p_recipient_points integer,
  p_meta             jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_points(p_actor, null, p_action, p_content_type, p_content_id, p_actor_points, p_meta);

  if p_author is not null and p_author <> p_actor then
    perform public.award_points(p_actor, p_author, p_action, p_content_type, p_content_id, p_recipient_points, p_meta);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. RLS — fiecare își vede istoricul; scriu doar funcțiile de mai sus
-- ---------------------------------------------------------------------
alter table public.points_ledger enable row level security;
alter table public.point_levels  enable row level security;

drop policy if exists "point_levels_select_all" on public.point_levels;
create policy "point_levels_select_all" on public.point_levels for select using (true);

drop policy if exists "points_ledger_select_own" on public.points_ledger;
create policy "points_ledger_select_own" on public.points_ledger
  for select to authenticated
  using (coalesce(recipient_id, actor_id) = auth.uid() or public.is_admin());

-- fără politici de insert/update/delete: registrul se scrie exclusiv din
-- funcții `security definer`

grant execute on function public.level_for_points(integer) to anon, authenticated;
grant execute on function public.level_for_points(bigint)  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Nivelul, adus la zi pentru conturile existente (toate au 0 puncte
--    până rulează backfill-ul din migrarea 6)
-- ---------------------------------------------------------------------
update public.profiles
   set points_level = public.level_for_points(points_total)
 where points_level is distinct from public.level_for_points(points_total);
