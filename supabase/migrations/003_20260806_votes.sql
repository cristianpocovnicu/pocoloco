-- =====================================================================
-- Pocoloco — Upvote / downvote cu persistență
-- Rulează DUPĂ 001_20260806_admin_dashboard.sql (are nevoie de is_admin()).
--
-- Un user poate avea un singur vot per experiență (up SAU down).
-- Contoarele experiences.upvotes / downvotes sunt ținute la zi de un
-- trigger, ca să nu depindem de client pentru numere corecte.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelul votes
-- ---------------------------------------------------------------------
create table if not exists public.votes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  experience_id uuid not null references public.experiences (id) on delete cascade,
  type          text not null check (type in ('up', 'down')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint votes_one_per_user_per_experience unique (user_id, experience_id)
);

create index if not exists votes_experience_idx on public.votes (experience_id);
create index if not exists votes_user_idx       on public.votes (user_id);

-- Contoarele trebuie să fie numerice și nenule ca să putem face +1 / -1
update public.experiences set upvotes   = 0 where upvotes   is null;
update public.experiences set downvotes = 0 where downvotes is null;
alter table public.experiences alter column upvotes   set default 0;
alter table public.experiences alter column downvotes set default 0;

-- ---------------------------------------------------------------------
-- 2. Trigger care ține contoarele sincronizate
--    security definer: userul votează experiențe care nu-i aparțin,
--    deci nu are drept de update pe ele sub RLS
-- ---------------------------------------------------------------------
create or replace function public.sync_experience_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.experiences
      set upvotes   = coalesce(upvotes, 0)   + (case when new.type = 'up'   then 1 else 0 end),
          downvotes = coalesce(downvotes, 0) + (case when new.type = 'down' then 1 else 0 end)
      where id = new.experience_id;

  elsif tg_op = 'DELETE' then
    update public.experiences
      set upvotes   = greatest(coalesce(upvotes, 0)   - (case when old.type = 'up'   then 1 else 0 end), 0),
          downvotes = greatest(coalesce(downvotes, 0) - (case when old.type = 'down' then 1 else 0 end), 0)
      where id = old.experience_id;

  elsif tg_op = 'UPDATE' and new.type is distinct from old.type then
    update public.experiences
      set upvotes   = greatest(coalesce(upvotes, 0)
                        + (case when new.type = 'up'   then 1 else 0 end)
                        - (case when old.type = 'up'   then 1 else 0 end), 0),
          downvotes = greatest(coalesce(downvotes, 0)
                        + (case when new.type = 'down' then 1 else 0 end)
                        - (case when old.type = 'down' then 1 else 0 end), 0)
      where id = new.experience_id;
  end if;

  return null;
end $$;

drop trigger if exists votes_sync_counts_trg on public.votes;
create trigger votes_sync_counts_trg
  after insert or update or delete on public.votes
  for each row execute function public.sync_experience_vote_counts();

-- updated_at la schimbarea votului
create or replace function public.votes_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists votes_touch_updated_at_trg on public.votes;
create trigger votes_touch_updated_at_trg
  before update on public.votes
  for each row execute function public.votes_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. RLS — fiecare user își gestionează doar propriile voturi
-- ---------------------------------------------------------------------
alter table public.votes enable row level security;

-- Voturile sunt publice (contorul e oricum public); necesar ca să știm
-- ce a votat userul curent
drop policy if exists "votes_select_all" on public.votes;
create policy "votes_select_all" on public.votes
  for select using (true);

drop policy if exists "votes_insert_own" on public.votes;
create policy "votes_insert_own" on public.votes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "votes_update_own" on public.votes;
create policy "votes_update_own" on public.votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "votes_delete_own" on public.votes;
create policy "votes_delete_own" on public.votes
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "votes_delete_admin" on public.votes;
create policy "votes_delete_admin" on public.votes
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Opțional — resincronizează contoarele cu tabelul votes.
--    Rulează DOAR dacă vrei să ștergi voturile vechi (cele făcute înainte
--    de acest sistem, care nu au rând în votes). Altfel lasă comentat.
-- ---------------------------------------------------------------------
-- update public.experiences e set
--   upvotes   = (select count(*) from public.votes v where v.experience_id = e.id and v.type = 'up'),
--   downvotes = (select count(*) from public.votes v where v.experience_id = e.id and v.type = 'down');
