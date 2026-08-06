-- =====================================================================
-- Pocoloco — Admin dashboard
-- Rulează acest fișier în Supabase → SQL Editor (o singură dată).
--
-- Adaugă:
--   1. profiles.role   ('user' | 'admin')
--   2. profiles.status ('active' | 'suspended')
--   3. funcția public.is_admin()
--   4. politici RLS care permit adminilor să vadă/modereze tot
--
-- IMPORTANT: după rulare, fă-ți contul admin:
--   update public.profiles set role = 'admin' where username = 'username_tau';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coloane noi pe profiles
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists role   text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active', 'suspended'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Helper: userul curent e admin?
--    security definer => nu declanșează recursiv politicile de pe profiles
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Politici RLS pentru admin
--    Notă: nu activăm RLS aici (`enable row level security`) ca să nu
--    blocăm tabelele care rulează momentan fără politici. Politicile de
--    mai jos devin active automat când RLS e pornit pe tabel.
-- ---------------------------------------------------------------------

-- profiles
drop policy if exists "admins_select_profiles" on public.profiles;
create policy "admins_select_profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admins_update_profiles" on public.profiles;
create policy "admins_update_profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- locations
drop policy if exists "admins_select_locations" on public.locations;
create policy "admins_select_locations" on public.locations
  for select using (public.is_admin());

drop policy if exists "admins_update_locations" on public.locations;
create policy "admins_update_locations" on public.locations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_delete_locations" on public.locations;
create policy "admins_delete_locations" on public.locations
  for delete using (public.is_admin());

-- experiences
drop policy if exists "admins_select_experiences" on public.experiences;
create policy "admins_select_experiences" on public.experiences
  for select using (public.is_admin());

drop policy if exists "admins_update_experiences" on public.experiences;
create policy "admins_update_experiences" on public.experiences
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_delete_experiences" on public.experiences;
create policy "admins_delete_experiences" on public.experiences
  for delete using (public.is_admin());

-- reports
drop policy if exists "admins_select_reports" on public.reports;
create policy "admins_select_reports" on public.reports
  for select using (public.is_admin());

drop policy if exists "admins_update_reports" on public.reports;
create policy "admins_update_reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Indexuri folosite de dashboard
-- ---------------------------------------------------------------------
create index if not exists locations_status_idx    on public.locations (status);
create index if not exists experiences_status_idx  on public.experiences (status);
create index if not exists reports_status_idx      on public.reports (status);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_role_idx       on public.profiles (role);
