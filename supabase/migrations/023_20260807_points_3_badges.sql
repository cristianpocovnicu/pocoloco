-- =====================================================================
-- Pocoloco — Economia de puncte (3/6): insignele devin milestone-uri
--
-- În loc de un al doilea sistem paralel, milestone-urile din documentul
-- de economie sunt exact insignele existente, plus câteva noi. Fiecare
-- insignă poate avea acum o recompensă în puncte, acordată o singură
-- dată, la câștigare.
--
-- Rulează DUPĂ 012_20260806_badges.sql și 021_20260807_points_1_core.sql.
-- =====================================================================

alter table public.badges add column if not exists points_reward integer not null default 0;

-- ---------------------------------------------------------------------
-- 1. Condiții noi: locuri vizitate, țări, voturi date și primite
-- ---------------------------------------------------------------------
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.badges'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%condition_type%';

  if v_conname is not null then
    execute format('alter table public.badges drop constraint %I', v_conname);
  end if;

  alter table public.badges
    add constraint badges_condition_type_check
    check (condition_type in (
      'experiences', 'trips', 'followers', 'following', 'guide',
      'visited_locations', 'countries', 'upvotes_given', 'upvotes_received'
    ));
end $$;

-- ---------------------------------------------------------------------
-- 2. Catalogul, cu recompensele din documentul de economie
-- ---------------------------------------------------------------------
insert into public.badges (id, name, description, emoji, condition_type, condition_value, sort_order, points_reward) values
  -- creație
  ('prima-experienta',    'Prima experiență',    'Ai publicat prima ta experiență.',                '✍️', 'experiences',       1,   10, 15),
  ('10-experiente',       '10 experiențe',       'Ai publicat 10 experiențe.',                      '🏆', 'experiences',       10,  20, 30),
  ('50-experiente',       '50 experiențe',       'Ai publicat 50 de experiențe. Impresionant.',     '🌟', 'experiences',       50,  30, 60),
  ('prima-calatorie',     'Prima călătorie',     'Ai creat primul tău itinerar.',                   '🧭', 'trips',             1,   40, 25),
  ('5-calatorii',         '5 călătorii',         'Ai creat 5 itinerarii. Creator serios.',          '📔', 'trips',             5,   45, 50),
  ('10-calatorii',        '10 călătorii',        'Ai creat 10 itinerarii.',                         '🗺️', 'trips',             10,  50, 60),
  -- explorare
  ('10-locuri-vizitate',  '10 locuri vizitate',  'Ai bifat 10 locuri ca vizitate.',                 '🥾', 'visited_locations', 10,  52, 20),
  ('25-locuri-vizitate',  '25 locuri vizitate',  'Ai bifat 25 de locuri. Călător cu experiență.',   '🎒', 'visited_locations', 25,  54, 40),
  ('5-tari',              '5 țări',              'Ai vizitat locuri din 5 țări diferite.',          '🌍', 'countries',         5,   56, 40),
  ('10-tari',             '10 țări',             'Ai vizitat locuri din 10 țări diferite.',         '✈️', 'countries',         10,  58, 75),
  -- social
  ('prima-urmarire',      'Prima urmărire',      'Ai început să urmărești un alt călător.',          '👋', 'following',         1,   60, 5),
  ('10-urmaritori',       '10 urmăritori',       'Ai strâns 10 urmăritori.',                        '🌱', 'followers',         10,  62, 20),
  ('50-urmaritori',       '50 urmăritori',       'Ai strâns 50 de urmăritori.',                     '📣', 'followers',         50,  64, 50),
  ('100-urmaritori',      '100 urmăritori',      'Ai strâns 100 de urmăritori.',                    '🔥', 'followers',         100, 70, 80),
  ('50-voturi-date',      '50 de voturi date',   'Ai votat pozitiv 50 de contribuții.',             '👍', 'upvotes_given',     50,  72, 15),
  ('100-voturi-primite',  '100 voturi primite',  'Experiențele tale au strâns 100 de voturi.',      '💯', 'upvotes_received',  100, 74, 30),
  ('ghid-verificat',      'Ghid verificat',      'Ești ghid recunoscut în comunitatea Pocoloco.',   '⭐', 'guide',             1,   80, 50)
on conflict (id) do update set
  name            = excluded.name,
  description     = excluded.description,
  emoji           = excluded.emoji,
  condition_type  = excluded.condition_type,
  condition_value = excluded.condition_value,
  sort_order      = excluded.sort_order,
  points_reward   = excluded.points_reward;

-- ---------------------------------------------------------------------
-- 3. Verificarea, cu condițiile noi și cu plata milestone-ului
--
--    `returning` ne spune exact ce insigne sunt noi, deci punctele se
--    dau o singură dată chiar dacă funcția rulează de o sută de ori.
-- ---------------------------------------------------------------------
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_experiences      integer;
  v_trips            integer;
  v_followers        integer;
  v_following        integer;
  v_visited          integer;
  v_countries        integer;
  v_upvotes_given    integer;
  v_upvotes_received integer;
  v_is_guide         boolean;
  r                  record;
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

  select count(*) into v_visited
    from public.saves
    where user_id = p_user_id and status = 'visited' and location_id is not null;

  select count(distinct lower(btrim(l.country))) into v_countries
    from public.saves s
    join public.locations l on l.id = s.location_id
    where s.user_id = p_user_id and s.status = 'visited'
      and l.country is not null and btrim(l.country) <> '';

  select count(*) into v_upvotes_given
    from public.votes where user_id = p_user_id and type = 'up';

  select coalesce(sum(coalesce(upvotes, 0)), 0)::integer into v_upvotes_received
    from public.experiences where author_id = p_user_id and status = 'active';

  -- insertul stă într-un CTE: PL/pgSQL nu poate itera direct peste
  -- „insert ... returning", dar poate peste un select care îl conține
  for r in
    with acordate as (
      insert into public.user_badges (user_id, badge_id)
      select p_user_id, b.id
      from public.badges b
      where (b.condition_type = 'experiences'       and v_experiences      >= b.condition_value)
         or (b.condition_type = 'trips'             and v_trips            >= b.condition_value)
         or (b.condition_type = 'followers'         and v_followers        >= b.condition_value)
         or (b.condition_type = 'following'         and v_following        >= b.condition_value)
         or (b.condition_type = 'visited_locations' and v_visited          >= b.condition_value)
         or (b.condition_type = 'countries'         and v_countries        >= b.condition_value)
         or (b.condition_type = 'upvotes_given'     and v_upvotes_given    >= b.condition_value)
         or (b.condition_type = 'upvotes_received'  and v_upvotes_received >= b.condition_value)
         or (b.condition_type = 'guide'             and coalesce(v_is_guide, false))
      on conflict (user_id, badge_id) do nothing
      returning badge_id
    )
    select badge_id from acordate
  loop
    perform public.award_points(
      p_user_id, null, 'milestone', 'badge', null,
      (select points_reward from public.badges where id = r.badge_id),
      jsonb_build_object('dedup_key', r.badge_id, 'badge_id', r.badge_id)
    );
  end loop;
end $$;

grant execute on function public.check_and_award_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Triggere pentru condițiile noi
--    (cele pentru experiențe, călătorii, follows și ghid există deja)
-- ---------------------------------------------------------------------
create or replace function public.badges_after_save()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.check_and_award_badges(new.user_id);
  return null;
end $$;

drop trigger if exists badges_save_trg on public.saves;
create trigger badges_save_trg
  after insert or update of status on public.saves
  for each row execute function public.badges_after_save();

create or replace function public.badges_after_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  perform public.check_and_award_badges(new.user_id);

  if new.experience_id is not null then
    select author_id into v_author from public.experiences where id = new.experience_id;
    if v_author is not null then
      perform public.check_and_award_badges(v_author);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists badges_vote_trg on public.votes;
create trigger badges_vote_trg
  after insert or update of type on public.votes
  for each row execute function public.badges_after_vote();

-- ---------------------------------------------------------------------
-- 5. Insignele meritate deja, acordate acum
--    Punctele lor intră în registru cu data de azi — pentru restul
--    istoricului vezi migrarea 6 (backfill).
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.check_and_award_badges(r.id);
  end loop;
end $$;
