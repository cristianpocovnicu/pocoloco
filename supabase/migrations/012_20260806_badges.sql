-- =====================================================================
-- Pocoloco — Insigne
--
-- Până acum insignele erau calculate în client, din numărul de
-- experiențe: nu existau în bază, nu se puteau adăuga altele noi și
-- dispăreau dacă schimbai codul. Aici devin date reale.
--
-- Rulează DUPĂ migrările pentru follows și trips.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Catalogul de insigne
--    id e un slug stabil, ca re-rularea migrării să nu dubleze rândurile
-- ---------------------------------------------------------------------
create table if not exists public.badges (
  id              text primary key,
  name            text not null,
  description     text not null,
  emoji           text not null,
  condition_type  text not null check (condition_type in ('experiences', 'trips', 'followers', 'following', 'guide')),
  condition_value integer not null default 1,
  sort_order      integer not null default 0
);

insert into public.badges (id, name, description, emoji, condition_type, condition_value, sort_order) values
  ('prima-experienta', 'Prima experiență', 'Ai publicat prima ta experiență.',              '✍️', 'experiences', 1,   10),
  ('10-experiente',    '10 experiențe',    'Ai publicat 10 experiențe.',                    '🏆', 'experiences', 10,  20),
  ('50-experiente',    '50 experiențe',    'Ai publicat 50 de experiențe. Impresionant.',   '🌟', 'experiences', 50,  30),
  ('prima-calatorie',  'Prima călătorie',  'Ai creat primul tău itinerar.',                 '🧭', 'trips',       1,   40),
  ('10-calatorii',     '10 călătorii',     'Ai creat 10 itinerarii.',                       '🗺️', 'trips',       10,  50),
  ('prima-urmarire',   'Prima urmărire',   'Ai început să urmărești un alt călător.',        '👋', 'following',   1,   60),
  ('100-urmaritori',   '100 urmăritori',   'Ai strâns 100 de urmăritori.',                  '🔥', 'followers',   100, 70),
  ('ghid-verificat',   'Ghid verificat',   'Ești ghid recunoscut în comunitatea Pocoloco.', '⭐', 'guide',       1,   80)
on conflict (id) do update set
  name            = excluded.name,
  description     = excluded.description,
  emoji           = excluded.emoji,
  condition_type  = excluded.condition_type,
  condition_value = excluded.condition_value,
  sort_order      = excluded.sort_order;

-- ---------------------------------------------------------------------
-- 2. Insignele câștigate
-- ---------------------------------------------------------------------
create table if not exists public.user_badges (
  user_id   uuid not null references auth.users (id) on delete cascade,
  badge_id  text not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id, earned_at desc);

-- ---------------------------------------------------------------------
-- 3. Verifică toate condițiile și acordă ce s-a câștigat
--    Insignele nu se retrag: odată câștigate, rămân.
-- ---------------------------------------------------------------------
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_experiences integer;
  v_trips       integer;
  v_followers   integer;
  v_following   integer;
  v_is_guide    boolean;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*) into v_experiences
    from public.experiences where author_id = p_user_id and status = 'active';
  select count(*) into v_trips
    from public.trips where author_id = p_user_id and status = 'active';
  select count(*) into v_followers
    from public.follows where following_id = p_user_id;
  select count(*) into v_following
    from public.follows where follower_id = p_user_id;
  select coalesce(is_guide, false) into v_is_guide
    from public.profiles where id = p_user_id;

  insert into public.user_badges (user_id, badge_id)
  select p_user_id, b.id
  from public.badges b
  where (b.condition_type = 'experiences' and v_experiences >= b.condition_value)
     or (b.condition_type = 'trips'       and v_trips       >= b.condition_value)
     or (b.condition_type = 'followers'   and v_followers   >= b.condition_value)
     or (b.condition_type = 'following'   and v_following   >= b.condition_value)
     or (b.condition_type = 'guide'       and coalesce(v_is_guide, false))
  on conflict (user_id, badge_id) do nothing;
end $$;

grant execute on function public.check_and_award_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Triggere — se agață de acțiunile care pot schimba un contor.
--    Nume distincte (badges_*), ca să nu se bată cu triggerele existente.
-- ---------------------------------------------------------------------
create or replace function public.badges_after_experience()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.check_and_award_badges(new.author_id);
  return null;
end $$;

drop trigger if exists badges_experience_trg on public.experiences;
create trigger badges_experience_trg
  after insert or update on public.experiences
  for each row execute function public.badges_after_experience();

create or replace function public.badges_after_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.check_and_award_badges(new.author_id);
  return null;
end $$;

drop trigger if exists badges_trip_trg on public.trips;
create trigger badges_trip_trg
  after insert or update on public.trips
  for each row execute function public.badges_after_trip();

-- un follow schimbă contoare la amândoi
create or replace function public.badges_after_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.check_and_award_badges(new.follower_id);
  perform public.check_and_award_badges(new.following_id);
  return null;
end $$;

drop trigger if exists badges_follow_trg on public.follows;
create trigger badges_follow_trg
  after insert on public.follows
  for each row execute function public.badges_after_follow();

create or replace function public.badges_after_guide()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.check_and_award_badges(new.id);
  return null;
end $$;

drop trigger if exists badges_guide_trg on public.profiles;
create trigger badges_guide_trg
  after update of is_guide on public.profiles
  for each row
  when (new.is_guide is distinct from old.is_guide)
  execute function public.badges_after_guide();

-- ---------------------------------------------------------------------
-- 5. RLS — catalogul și insignele câștigate sunt publice (apar pe
--    profilurile publice); scrie doar funcția de mai sus
-- ---------------------------------------------------------------------
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "badges_select_all" on public.badges;
create policy "badges_select_all" on public.badges for select using (true);

drop policy if exists "user_badges_select_all" on public.user_badges;
create policy "user_badges_select_all" on public.user_badges for select using (true);

-- ---------------------------------------------------------------------
-- 6. Acordă retroactiv insignele meritate de conturile existente
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.check_and_award_badges(r.id);
  end loop;
end $$;
