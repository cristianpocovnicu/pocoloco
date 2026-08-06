-- =====================================================================
-- Pocoloco — Notificări
-- Rulează DUPĂ migrările pentru votes, follows și comments.
--
-- Notificările sunt generate exclusiv de triggere (funcții security
-- definer). Userii nu au politică de INSERT, deci nimeni nu-și poate
-- fabrica notificări; poți doar să le citești, să le marchezi citite
-- și să le ștergi pe ale tale.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelul
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade, -- destinatarul
  actor_id    uuid references auth.users (id) on delete cascade,          -- cine a declanșat
  type        text not null check (type in ('upvote', 'follow', 'comment', 'reply')),
  entity_type text check (entity_type in ('experience', 'comment', 'user')),
  entity_id   uuid,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where not read;

-- Un upvote / un follow produc o singură notificare, chiar dacă userul
-- votează, retrage și votează din nou.
create unique index if not exists notifications_unique_action_idx
  on public.notifications (user_id, actor_id, type, entity_id)
  where type in ('upvote', 'follow');

-- ---------------------------------------------------------------------
-- 2. Triggere care generează notificările
-- ---------------------------------------------------------------------

-- Upvote pe experiența ta -----------------------------------------------
create or replace function public.notify_on_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destinatar uuid;
begin
  -- OLD/NEW nu sunt amândouă disponibile: ramurile trebuie separate strict
  if tg_op = 'DELETE' then
    delete from public.notifications
     where type = 'upvote'
       and actor_id = old.user_id
       and entity_type = 'experience'
       and entity_id = old.experience_id;
    return null;
  end if;

  -- vot schimbat în down => scoatem notificarea
  if new.type <> 'up' then
    delete from public.notifications
     where type = 'upvote'
       and actor_id = new.user_id
       and entity_type = 'experience'
       and entity_id = new.experience_id;
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

drop trigger if exists votes_notify_trg on public.votes;
create trigger votes_notify_trg
  after insert or update or delete on public.votes
  for each row execute function public.notify_on_vote();

-- Cineva te urmărește ---------------------------------------------------
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
     where type = 'follow' and user_id = old.following_id and actor_id = old.follower_id;
    return null;
  end if;

  if new.follower_id <> new.following_id then
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
    values (new.following_id, new.follower_id, 'follow', 'user', new.follower_id)
    on conflict do nothing;
  end if;

  return null;
end $$;

drop trigger if exists follows_notify_trg on public.follows;
create trigger follows_notify_trg
  after insert or delete on public.follows
  for each row execute function public.notify_on_follow();

-- Comentariu la experiența ta / răspuns la comentariul tău --------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  autor_experienta uuid;
  autor_parinte    uuid;
begin
  select author_id into autor_experienta from public.experiences where id = new.experience_id;

  -- răspuns => îl anunțăm pe autorul comentariului-părinte
  if new.parent_id is not null then
    select author_id into autor_parinte from public.comments where id = new.parent_id;

    if autor_parinte is not null and autor_parinte <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
      values (autor_parinte, new.author_id, 'reply', 'experience', new.experience_id);
    end if;
  end if;

  -- autorul experienței, dacă nu e chiar el comentatorul sau cel deja anunțat
  if autor_experienta is not null
     and autor_experienta <> new.author_id
     and (autor_parinte is null or autor_experienta <> autor_parinte) then
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
    values (autor_experienta, new.author_id, 'comment', 'experience', new.experience_id);
  end if;

  return null;
end $$;

drop trigger if exists comments_notify_trg on public.comments;
create trigger comments_notify_trg
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------------
-- 3. RLS — fără politică de INSERT: doar triggerele scriu
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Realtime — pentru badge-ul din sidebar
--    Dacă publicația nu există, activează Realtime din
--    Supabase → Database → Replication și rulează din nou secțiunea.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when undefined_object then
    raise notice 'Publicația supabase_realtime nu există. Activează Realtime din dashboard, apoi rulează: alter publication supabase_realtime add table public.notifications;';
end $$;
