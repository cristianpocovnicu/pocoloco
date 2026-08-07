-- =====================================================================
-- Pocoloco — Povești neterminate
--
-- Fluxul de creare a devenit un singur ecran care crește: poți începe cu
-- un loc și adăuga opriri până obosești. Ca să nu pierzi tot dacă închizi
-- pagina, starea ecranului se salvează aici, ca jsonb.
--
-- Un singur draft per user, intenționat: e „povestea la care lucrezi
-- acum", nu o arhivă. Insertul se face cu on conflict do update.
--
-- Ce NU rezolvă migrarea asta: pozele urcate într-un draft abandonat
-- rămân în bucket. Curățenia lor e o treabă separată (job periodic peste
-- storage.objects), nu ceva ce poate face schema.
--
-- Rulează oricând după 20260806_profile_on_signup.sql.
-- =====================================================================

create table if not exists public.creation_drafts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- un singur draft per user
create unique index if not exists creation_drafts_user_idx
  on public.creation_drafts (user_id);

-- ---------------------------------------------------------------------
-- updated_at se ține singur: clientul salvează des, cu debounce
-- ---------------------------------------------------------------------
create or replace function public.creation_drafts_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists creation_drafts_touch_trg on public.creation_drafts;
create trigger creation_drafts_touch_trg
  before update on public.creation_drafts
  for each row execute function public.creation_drafts_touch();

-- ---------------------------------------------------------------------
-- RLS — un draft e strict al autorului lui. Nici adminii n-au ce căuta
-- într-o poveste nepublicată.
-- ---------------------------------------------------------------------
alter table public.creation_drafts enable row level security;

drop policy if exists "creation_drafts_select_own" on public.creation_drafts;
create policy "creation_drafts_select_own" on public.creation_drafts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "creation_drafts_insert_own" on public.creation_drafts;
create policy "creation_drafts_insert_own" on public.creation_drafts
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "creation_drafts_update_own" on public.creation_drafts;
create policy "creation_drafts_update_own" on public.creation_drafts
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "creation_drafts_delete_own" on public.creation_drafts;
create policy "creation_drafts_delete_own" on public.creation_drafts
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Verificări
-- ---------------------------------------------------------------------
do $$
declare
  v_rls      boolean;
  v_politici integer;
begin
  select rowsecurity into v_rls
  from pg_tables where schemaname = 'public' and tablename = 'creation_drafts';

  select count(*) into v_politici
  from pg_policies where schemaname = 'public' and tablename = 'creation_drafts';

  if not coalesce(v_rls, false) then
    raise notice 'ATENȚIE: RLS nu e activ pe creation_drafts — draft-urile ar fi vizibile tuturor.';
  end if;

  if v_politici <> 4 then
    raise notice 'ATENȚIE: creation_drafts are % politici, așteptam 4 (select/insert/update/delete).', v_politici;
  end if;

  raise notice 'creation_drafts: gata. RLS activ, % politici.', v_politici;
end $$;
