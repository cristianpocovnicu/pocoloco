-- =====================================================================
-- Pocoloco — Sistem de aprobare locații
-- Rulează DUPĂ 20260806_admin_dashboard.sql (are nevoie de is_admin()).
--
-- Regula: orice locație adăugată de un user pleacă cu status 'pending'
-- și devine publică doar după ce un admin o aprobă din /admin/locations.
--
-- ÎNAINTE de secțiunea 4 (RLS), verifică ce triggere ai pe tabele:
--   select tgname, tgrelid::regclass, proname
--   from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--   where not tgisinternal and tgrelid in ('public.locations'::regclass,
--                                          'public.experiences'::regclass);
-- Dacă ai un trigger care actualizează locations.experience_count la
-- inserarea unei experiențe, funcția lui trebuie să fie SECURITY DEFINER,
-- altfel RLS îl va bloca (userul nu poate scrie în locația altcuiva):
--   alter function public.numele_functiei() security definer;
--
-- Rollback rapid dacă ceva se blochează:
--   alter table public.locations disable row level security;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Curățare + valori implicite pe locations.status
-- ---------------------------------------------------------------------
-- Locațiile existente (create înainte de moderare) rămân publice
update public.locations set status = 'approved' where status is null or status = '';

alter table public.locations alter column status set default 'pending';
alter table public.locations alter column status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'locations_status_check') then
    alter table public.locations
      add constraint locations_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. La INSERT: userii obișnuiți nu pot alege statusul
-- ---------------------------------------------------------------------
create or replace function public.locations_force_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() e null pentru service_role / SQL Editor => lăsăm seed-urile în pace
  if auth.uid() is not null then
    if new.added_by is null then
      new.added_by := auth.uid();
    end if;
    if not public.is_admin() then
      new.status := 'pending';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists locations_force_pending_trg on public.locations;
create trigger locations_force_pending_trg
  before insert on public.locations
  for each row execute function public.locations_force_pending();

-- ---------------------------------------------------------------------
-- 3. La UPDATE: doar adminii pot schimba statusul
-- ---------------------------------------------------------------------
create or replace function public.locations_protect_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end $$;

drop trigger if exists locations_protect_status_trg on public.locations;
create trigger locations_protect_status_trg
  before update on public.locations
  for each row execute function public.locations_protect_status();

-- ---------------------------------------------------------------------
-- 4. RLS — locațiile neaprobate nu ies din baza de date
--    (aplicația filtrează deja, asta e plasa de siguranță)
-- ---------------------------------------------------------------------
alter table public.locations enable row level security;

-- Public: doar locațiile aprobate. Autorul își vede propriile locații,
-- adminii le văd pe toate (vezi și admins_select_locations din migrarea 1).
drop policy if exists "locations_select_visible" on public.locations;
create policy "locations_select_visible" on public.locations
  for select using (
    status = 'approved'
    or added_by = auth.uid()
    or public.is_admin()
  );

-- Orice user logat poate propune o locație, dar doar pe numele lui
drop policy if exists "locations_insert_own" on public.locations;
create policy "locations_insert_own" on public.locations
  for insert to authenticated
  with check (added_by = auth.uid());

-- Autorul își poate corecta locația; statusul rămâne blocat de trigger
drop policy if exists "locations_update_own" on public.locations;
create policy "locations_update_own" on public.locations
  for update to authenticated
  using (added_by = auth.uid())
  with check (added_by = auth.uid());

create index if not exists locations_added_by_idx on public.locations (added_by);
