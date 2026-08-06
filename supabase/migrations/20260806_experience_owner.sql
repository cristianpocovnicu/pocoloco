-- =====================================================================
-- Pocoloco — Autorul își poate edita și șterge experiențele
--
-- Până acum, ștergerea unei experiențe se putea face doar din /admin.
-- Politicile de mai jos dau autorului drept de update și delete pe ce a
-- scris el, păstrând drepturile adminilor din migrarea 1.
--
-- NU pornim RLS aici. Verifică întâi dacă e activat pe experiences:
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename = 'experiences';
--
-- Dacă rowsecurity = false, oricine are cheia anon poate scrie în tabel.
-- După ce confirmi că politicile de mai jos acoperă tot ce face
-- aplicația (citire feed, adăugare experiență, editare, ștergere),
-- pornește-l cu:
--   alter table public.experiences enable row level security;
-- și testează imediat adăugarea unei experiențe. Rollback:
--   alter table public.experiences disable row level security;
-- =====================================================================

-- citire: experiențele publice, plus ciornele proprii
drop policy if exists "experiences_select_visible" on public.experiences;
create policy "experiences_select_visible" on public.experiences
  for select using (
    status in ('active', 'reported')
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "experiences_insert_own" on public.experiences;
create policy "experiences_insert_own" on public.experiences
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "experiences_update_own" on public.experiences;
create policy "experiences_update_own" on public.experiences
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "experiences_delete_own" on public.experiences;
create policy "experiences_delete_own" on public.experiences
  for delete to authenticated
  using (author_id = auth.uid());

create index if not exists experiences_author_idx on public.experiences (author_id);
