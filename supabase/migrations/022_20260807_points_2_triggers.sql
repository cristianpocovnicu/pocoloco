-- =====================================================================
-- Pocoloco — Economia de puncte (2/6): triggerele
--
-- Toate se numesc points_* și sunt separate de triggerele existente
-- (contoare, notificări, insigne). Niciunul nu blochează acțiunea care
-- l-a pornit: award_points înghite orice eroare.
--
-- Ce NU e aici, pentru că schema n-are încă suportul (vezi docs):
--   - salvarea unei experiențe sau a unui pont individual
--   - urmărirea unei locații
--   - trip privat (toate călătoriile sunt publice, deci bonusul de +8
--     se acordă oricărei călătorii cu status 'active')
--
-- Rulează DUPĂ 021_20260807_points_1_core.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Locație nouă — 8 puncte, o dată per locație
-- ---------------------------------------------------------------------
create or replace function public.points_after_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.added_by is not null then
    perform public.award_points(new.added_by, null, 'location_added', 'location', new.id, 8);
  end if;
  return null;
end $$;

drop trigger if exists points_location_trg on public.locations;
create trigger points_location_trg
  after insert on public.locations
  for each row execute function public.points_after_location();

-- ---------------------------------------------------------------------
-- 2. Experiență — 10 de bază + bonusuri de completitudine (max 27)
--
--    Se plătește la publicare, nu la salvarea ca draft. Un draft care
--    devine 'active' mai târziu primește punctele atunci.
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

  if new.location_id is not null then
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

drop trigger if exists points_experience_trg on public.experiences;
create trigger points_experience_trg
  after insert or update of status on public.experiences
  for each row execute function public.points_after_experience();

-- ---------------------------------------------------------------------
-- 3. Călătorie — 20 de bază + cover + rezumat + public (max 34)
-- ---------------------------------------------------------------------
create or replace function public.points_after_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := 20;
  v_parts  text[]  := array['bază'];
begin
  if new.status is distinct from 'active' then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'active' then
      return null;
    end if;
  end if;

  if new.cover_image is not null and new.cover_image <> '' then
    v_points := v_points + 3; v_parts := v_parts || 'copertă';
  end if;
  if coalesce(btrim(new.description), '') <> '' then
    v_points := v_points + 3; v_parts := v_parts || 'rezumat';
  end if;
  -- toate călătoriile sunt publice deocamdată; când apare opțiunea de
  -- privat, condiția se schimbă aici
  v_points := v_points + 8; v_parts := v_parts || 'public';

  perform public.award_points(
    new.author_id, null, 'trip_posted', 'trip', new.id, v_points,
    jsonb_build_object('parts', v_parts)
  );
  return null;
exception when others then
  raise notice 'points_after_trip(%): %', new.id, sqlerrm;
  return null;
end $$;

drop trigger if exists points_trip_trg on public.trips;
create trigger points_trip_trg
  after insert or update of status on public.trips
  for each row execute function public.points_after_trip();

-- ---------------------------------------------------------------------
-- 4. Voturi — doar cele pozitive plătesc. Un vot negativ nu ia puncte
--    nimănui; retragerea unui vot nu retrage punctele deja date.
-- ---------------------------------------------------------------------
create or replace function public.points_after_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author  uuid;
  v_trip_id uuid;
begin
  if new.type is distinct from 'up' then
    return null;
  end if;

  if new.experience_id is not null then
    select author_id into v_author from public.experiences where id = new.experience_id;
    perform public.award_interaction(
      new.user_id, v_author, 'experience_upvoted', 'experience', new.experience_id, 1, 2
    );
    return null;
  end if;

  if new.comment_id is not null then
    select author_id into v_author from public.comments where id = new.comment_id;
    perform public.award_interaction(
      new.user_id, v_author, 'comment_upvoted', 'comment', new.comment_id, 1, 1
    );
    return null;
  end if;

  -- Voturile pe călătorii n-au încă suport în aplicație. Citim coloana
  -- prin jsonb ca funcția să nu crape dacă `votes` chiar nu o are.
  v_trip_id := nullif(to_jsonb(new) ->> 'trip_id', '')::uuid;
  if v_trip_id is not null then
    select author_id into v_author from public.trips where id = v_trip_id;
    perform public.award_interaction(
      new.user_id, v_author, 'trip_upvoted', 'trip', v_trip_id, 1, 3
    );
  end if;

  return null;
exception when others then
  raise notice 'points_after_vote: %', sqlerrm;
  return null;
end $$;

drop trigger if exists points_vote_trg on public.votes;
create trigger points_vote_trg
  after insert or update of type on public.votes
  for each row execute function public.points_after_vote();

-- ---------------------------------------------------------------------
-- 5. Comentarii — 3/3, maxim 3 recompensate per experiență per user.
--    Răspunsul autorului la un comentariu pe conținutul propriu: 2/2,
--    maxim 5 per experiență.
-- ---------------------------------------------------------------------
create or replace function public.points_after_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid;
  v_parent   uuid;
  v_rewarded integer;
begin
  select author_id into v_owner from public.experiences where id = new.experience_id;

  -- răspunsul autorului conținutului la un comentariu primit
  if v_owner is not null and new.author_id = v_owner and new.parent_id is not null then
    select count(*) into v_rewarded
    from public.points_ledger
    where actor_id = new.author_id
      and action_type = 'comment_reply'
      and recipient_id is null
      and meta ->> 'experience_id' = new.experience_id::text;

    if v_rewarded >= 5 then
      return null;
    end if;

    select author_id into v_parent from public.comments where id = new.parent_id;
    perform public.award_interaction(
      new.author_id, v_parent, 'comment_reply', 'comment', new.id, 2, 2,
      jsonb_build_object('experience_id', new.experience_id)
    );
    return null;
  end if;

  select count(*) into v_rewarded
  from public.points_ledger
  where actor_id = new.author_id
    and action_type = 'comment_added'
    and recipient_id is null
    and meta ->> 'experience_id' = new.experience_id::text;

  if v_rewarded >= 3 then
    return null;
  end if;

  perform public.award_interaction(
    new.author_id, v_owner, 'comment_added', 'comment', new.id, 3, 3,
    jsonb_build_object('experience_id', new.experience_id)
  );
  return null;
exception when others then
  raise notice 'points_after_comment(%): %', new.id, sqlerrm;
  return null;
end $$;

drop trigger if exists points_comment_trg on public.comments;
create trigger points_comment_trg
  after insert on public.comments
  for each row execute function public.points_after_comment();

-- ---------------------------------------------------------------------
-- 6. Salvări — jurnalul de călătorie și salvarea unei călătorii
-- ---------------------------------------------------------------------
create or replace function public.points_after_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    if new.trip_id is not null then
      select author_id into v_author from public.trips where id = new.trip_id;
      perform public.award_interaction(new.user_id, v_author, 'trip_saved', 'trip', new.trip_id, 1, 10);

    elsif new.location_id is not null then
      if new.status = 'visited' then
        perform public.award_points(new.user_id, null, 'location_visited', 'location', new.location_id, 2);
      else
        perform public.award_points(new.user_id, null, 'location_wishlist', 'location', new.location_id, 1);
      end if;
    end if;

  elsif tg_op = 'UPDATE' then
    -- ai plănuit și chiar ai ajuns acolo
    if new.location_id is not null
       and new.status = 'visited'
       and old.status = 'want_to_go' then
      perform public.award_points(new.user_id, null, 'visit_confirmed', 'location', new.location_id, 3);
    end if;
  end if;

  return null;
exception when others then
  raise notice 'points_after_save: %', sqlerrm;
  return null;
end $$;

drop trigger if exists points_save_trg on public.saves;
create trigger points_save_trg
  after insert or update of status on public.saves
  for each row execute function public.points_after_save();

-- ---------------------------------------------------------------------
-- 7. Urmăriri — 2/5, o singură dată per pereche, pe viață
-- ---------------------------------------------------------------------
create or replace function public.points_after_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_interaction(
    new.follower_id, new.following_id, 'user_followed', 'user', new.following_id, 2, 5
  );
  return null;
exception when others then
  raise notice 'points_after_follow: %', sqlerrm;
  return null;
end $$;

drop trigger if exists points_follow_trg on public.follows;
create trigger points_follow_trg
  after insert on public.follows
  for each row execute function public.points_after_follow();

-- ---------------------------------------------------------------------
-- 8. Profil completat — bio + poză, o singură dată
--
--    `update of bio, avatar_url` plus clauza WHEN: recalcularea
--    totalului atinge alte coloane, deci nu poate porni triggerul din
--    nou (și nici o recursie).
-- ---------------------------------------------------------------------
create or replace function public.points_after_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bio is not null and btrim(new.bio) <> '' and new.avatar_url is not null then
    perform public.award_points(new.id, null, 'profile_completed', null, null, 20);
  end if;
  return null;
exception when others then
  raise notice 'points_after_profile(%): %', new.id, sqlerrm;
  return null;
end $$;

drop trigger if exists points_profile_trg on public.profiles;
create trigger points_profile_trg
  after update of bio, avatar_url on public.profiles
  for each row
  when (new.bio is distinct from old.bio or new.avatar_url is distinct from old.avatar_url)
  execute function public.points_after_profile();
