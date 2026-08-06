-- =====================================================================
-- Pocoloco — Voturile capătă efect
--
-- 1. net_score = upvotes - downvotes, coloană generată, ca sortarea după
--    scor să fie o simplă ORDER BY, nu un calcul în client
-- 2. votes acceptă și comentarii, cu exact o țintă per rând
-- 3. contoarele de pe comments sunt ținute de același trigger
--
-- Rulează DUPĂ 20260806_votes.sql și 20260806_comments.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contoare pe comentarii
-- ---------------------------------------------------------------------
alter table public.comments add column if not exists upvotes   integer not null default 0;
alter table public.comments add column if not exists downvotes integer not null default 0;

-- ---------------------------------------------------------------------
-- 2. Scor net, generat — nu poate ieși din sinc cu contoarele
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'experiences' and column_name = 'net_score'
  ) then
    alter table public.experiences
      add column net_score integer
      generated always as (coalesce(upvotes, 0) - coalesce(downvotes, 0)) stored;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'net_score'
  ) then
    alter table public.comments
      add column net_score integer
      generated always as (coalesce(upvotes, 0) - coalesce(downvotes, 0)) stored;
  end if;
end $$;

-- feedul „Populare" și lista de conținut semnalat
create index if not exists experiences_net_score_idx on public.experiences (net_score desc, created_at desc);
create index if not exists comments_net_score_idx    on public.comments (net_score);

-- ---------------------------------------------------------------------
-- 3. votes primește comment_id; exact o țintă per rând
-- ---------------------------------------------------------------------
alter table public.votes add column if not exists comment_id uuid references public.comments (id) on delete cascade;

do $$
begin
  -- experience_id devine opțional: un vot e ori pe experiență, ori pe comentariu
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'votes'
      and column_name = 'experience_id' and is_nullable = 'NO'
  ) then
    alter table public.votes alter column experience_id drop not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'votes_single_target_check') then
    alter table public.votes add constraint votes_single_target_check check (
      (experience_id is not null and comment_id is null)
      or (experience_id is null and comment_id is not null)
    );
  end if;
end $$;

-- Constrângerea veche acoperea doar experiențele; o înlocuim cu indexuri
-- parțiale, ca rândurile de comentarii să nu se lovească de ea.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'votes_one_per_user_per_experience') then
    alter table public.votes drop constraint votes_one_per_user_per_experience;
  end if;
end $$;

create unique index if not exists votes_user_experience_idx
  on public.votes (user_id, experience_id) where experience_id is not null;
create unique index if not exists votes_user_comment_idx
  on public.votes (user_id, comment_id) where comment_id is not null;
create index if not exists votes_comment_idx on public.votes (comment_id) where comment_id is not null;

-- ---------------------------------------------------------------------
-- 4. Triggerul de contoare, acum și pentru comentarii
-- ---------------------------------------------------------------------
create or replace function public.sync_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta_up   integer := 0;
  delta_down integer := 0;
begin
  if tg_op = 'INSERT' then
    delta_up   := case when new.type = 'up'   then 1 else 0 end;
    delta_down := case when new.type = 'down' then 1 else 0 end;

    if new.experience_id is not null then
      update public.experiences
        set upvotes = coalesce(upvotes, 0) + delta_up,
            downvotes = coalesce(downvotes, 0) + delta_down
        where id = new.experience_id;
    elsif new.comment_id is not null then
      update public.comments
        set upvotes = coalesce(upvotes, 0) + delta_up,
            downvotes = coalesce(downvotes, 0) + delta_down
        where id = new.comment_id;
    end if;

  elsif tg_op = 'DELETE' then
    delta_up   := case when old.type = 'up'   then 1 else 0 end;
    delta_down := case when old.type = 'down' then 1 else 0 end;

    if old.experience_id is not null then
      update public.experiences
        set upvotes = greatest(coalesce(upvotes, 0) - delta_up, 0),
            downvotes = greatest(coalesce(downvotes, 0) - delta_down, 0)
        where id = old.experience_id;
    elsif old.comment_id is not null then
      update public.comments
        set upvotes = greatest(coalesce(upvotes, 0) - delta_up, 0),
            downvotes = greatest(coalesce(downvotes, 0) - delta_down, 0)
        where id = old.comment_id;
    end if;

  elsif tg_op = 'UPDATE' and new.type is distinct from old.type then
    delta_up   := (case when new.type = 'up'   then 1 else 0 end) - (case when old.type = 'up'   then 1 else 0 end);
    delta_down := (case when new.type = 'down' then 1 else 0 end) - (case when old.type = 'down' then 1 else 0 end);

    if new.experience_id is not null then
      update public.experiences
        set upvotes = greatest(coalesce(upvotes, 0) + delta_up, 0),
            downvotes = greatest(coalesce(downvotes, 0) + delta_down, 0)
        where id = new.experience_id;
    elsif new.comment_id is not null then
      update public.comments
        set upvotes = greatest(coalesce(upvotes, 0) + delta_up, 0),
            downvotes = greatest(coalesce(downvotes, 0) + delta_down, 0)
        where id = new.comment_id;
    end if;
  end if;

  return null;
end $$;

-- înlocuiește triggerul vechi, care știa doar de experiențe
drop trigger if exists votes_sync_counts_trg on public.votes;
create trigger votes_sync_counts_trg
  after insert or update or delete on public.votes
  for each row execute function public.sync_vote_counts();

-- ---------------------------------------------------------------------
-- 5. Notificările de upvote rămân doar pentru experiențe
--    (funcția veche presupunea că experience_id e mereu completat)
-- ---------------------------------------------------------------------
create or replace function public.notify_on_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destinatar uuid;
begin
  if tg_op = 'DELETE' then
    if old.experience_id is null then return null; end if;
    delete from public.notifications
     where type = 'upvote' and actor_id = old.user_id
       and entity_type = 'experience' and entity_id = old.experience_id;
    return null;
  end if;

  -- voturile pe comentarii nu generează notificări deocamdată
  if new.experience_id is null then return null; end if;

  if new.type <> 'up' then
    delete from public.notifications
     where type = 'upvote' and actor_id = new.user_id
       and entity_type = 'experience' and entity_id = new.experience_id;
    return null;
  end if;

  select author_id into destinatar from public.experiences where id = new.experience_id;
  if destinatar is null or destinatar = new.user_id then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
  values (destinatar, new.user_id, 'upvote', 'experience', new.experience_id)
  on conflict do nothing;

  return null;
end $$;

-- funcția veche nu mai e folosită de niciun trigger
drop function if exists public.sync_experience_vote_counts();

-- ---------------------------------------------------------------------
-- 6. Contoarele comentariilor, aduse la zi cu voturile existente
-- ---------------------------------------------------------------------
update public.comments c set
  upvotes   = (select count(*) from public.votes v where v.comment_id = c.id and v.type = 'up'),
  downvotes = (select count(*) from public.votes v where v.comment_id = c.id and v.type = 'down');
