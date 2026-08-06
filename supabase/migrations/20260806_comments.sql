-- =====================================================================
-- Pocoloco — Comentarii cu reply-uri (thread pe 2 nivele)
-- Rulează DUPĂ 20260806_admin_dashboard.sql (are nevoie de is_admin()).
--
-- Rulează întâi supabase/checks/inspect_comments.sql și verifică:
--   - ce coloane are comments (așteptăm experience_id, author_id, content)
--   - dacă ai deja un trigger pentru experiences.comment_count
--     => șterge-l, altfel se numără de două ori
--
-- Migrarea e idempotentă: creează tabelul dacă lipsește, altfel doar
-- completează parent_id, indexurile, politicile și triggerul.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Oprire clară dacă tabelul există cu alte nume de coloane
-- ---------------------------------------------------------------------
do $$
declare
  exista boolean;
  lipsa  text[] := '{}';
  col    text;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'comments'
  ) into exista;

  if exista then
    foreach col in array array['experience_id', 'author_id', 'content'] loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'comments' and column_name = col
      ) then
        lipsa := lipsa || col;
      end if;
    end loop;

    if array_length(lipsa, 1) > 0 then
      raise exception 'public.comments există dar îi lipsesc coloanele: %. Redenumește-le (alter table public.comments rename column ... to ...) și rulează din nou.', array_to_string(lipsa, ', ');
    end if;
  end if;
end $$;

-- Avertisment dacă mai există triggere pe comments (posibilă dublă numărare)
do $$
declare
  altele text;
begin
  select string_agg(tgname, ', ') into altele
  from pg_trigger
  where tgrelid = to_regclass('public.comments')
    and not tgisinternal
    and tgname not in ('comments_sync_count_trg', 'comments_touch_updated_at_trg');

  if altele is not null then
    raise notice 'ATENȚIE: pe public.comments mai există triggerele: %. Verifică să nu actualizeze și ele comment_count.', altele;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Tabelul
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  author_id     uuid not null references auth.users (id) on delete cascade,
  parent_id     uuid references public.comments (id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- parent_id pentru instalările unde tabelul exista deja fără el
alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete cascade;
alter table public.comments
  add column if not exists created_at timestamptz not null default now();
alter table public.comments
  add column if not exists updated_at timestamptz not null default now();

create index if not exists comments_experience_idx on public.comments (experience_id, created_at);
create index if not exists comments_parent_idx     on public.comments (parent_id);
create index if not exists comments_author_idx     on public.comments (author_id);

-- Contorul trebuie să fie numeric și nenul ca să putem face +1 / -1
update public.experiences set comment_count = 0 where comment_count is null;
alter table public.experiences alter column comment_count set default 0;

-- ---------------------------------------------------------------------
-- 2. Trigger pentru experiences.comment_count
--    security definer: comentezi la experiențele altora, deci nu ai
--    drept de update pe ele sub RLS
--    Ștergerea unui comentariu-părinte șterge în cascadă reply-urile,
--    iar triggerul rulează pentru fiecare rând => contorul rămâne corect
-- ---------------------------------------------------------------------
create or replace function public.sync_experience_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.experiences
      set comment_count = coalesce(comment_count, 0) + 1
      where id = new.experience_id;
  elsif tg_op = 'DELETE' then
    update public.experiences
      set comment_count = greatest(coalesce(comment_count, 0) - 1, 0)
      where id = old.experience_id;
  end if;
  return null;
end $$;

drop trigger if exists comments_sync_count_trg on public.comments;
create trigger comments_sync_count_trg
  after insert or delete on public.comments
  for each row execute function public.sync_experience_comment_count();

create or replace function public.comments_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists comments_touch_updated_at_trg on public.comments;
create trigger comments_touch_updated_at_trg
  before update on public.comments
  for each row execute function public.comments_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments
  for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- autorul comentariului sau un admin
drop policy if exists "comments_delete_own_or_admin" on public.comments;
create policy "comments_delete_own_or_admin" on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Aducem contoarele la realitate (până acum nimic nu scria comentarii)
-- ---------------------------------------------------------------------
update public.experiences e
  set comment_count = (
    select count(*) from public.comments c where c.experience_id = e.id
  );
