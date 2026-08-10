-- =====================================================================
-- Pocoloco — Locurile venite din Google se aprobă singure
--
-- Moderarea a fost pusă ca să nu intre în bază locuri inventate, scrise
-- greșit sau duplicate. Pentru un loc ales din Google, verificarea aia e
-- deja făcută de altcineva: numele, coordonatele și existența vin de la
-- Places, nu de la om. Un admin care se uită după aceea nu face decât să
-- confirme ce a spus Google.
--
-- De aici: `google_place_id is not null` => `approved` din prima.
-- Aprobarea manuală rămâne exact pentru cazul în care chiar decide ceva:
-- locurile scrise de mână, fără place id.
--
-- Reversibil: dacă apare abuz, se rescrie funcția înapoi și locurile deja
-- aprobate se pot trece la loc dintr-un update.
--
-- **Fără backfill**, intenționat: locațiile aflate acum în așteptare se
-- aprobă manual, una câte una.
--
-- Rulează DUPĂ 002_20260806_location_approval.sql și
-- 020_20260807_location_photos.sql (de acolo vine coloana).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Dependența, verificată explicit
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'locations'
      and column_name = 'google_place_id'
  ) then
    raise exception 'locations.google_place_id lipsește — rulează întâi migrarea 020.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Triggerul de status, rescris
--
-- Restul funcției rămâne cum era: completarea lui `added_by` și faptul că
-- un admin își alege singur statusul.
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
      -- ales din Google: numele și coordonatele sunt deja verificate acolo
      new.status := case
        when new.google_place_id is not null then 'approved'
        else 'pending'
      end;
    end if;
  end if;

  return new;
end $$;

-- triggerul există din migrarea 2; îl recreăm ca migrarea să fie completă
drop trigger if exists locations_force_pending_trg on public.locations;
create trigger locations_force_pending_trg
  before insert on public.locations
  for each row execute function public.locations_force_pending();

-- ---------------------------------------------------------------------
-- 2. Ce rămâne de moderat
--
-- Notificările (migrarea 44) și emailul se declanșează amândouă pe
-- `status = 'pending'`. Locurile auto-aprobate nu mai trec pe acolo, deci
-- adminul nu mai e chemat pentru ce n-are de decis. Nu e nimic de
-- modificat la ele — de asta doar numărăm, ca să se vadă efectul.
-- ---------------------------------------------------------------------
do $$
declare
  v_pending    integer;
  v_cu_place   integer;
begin
  select count(*) into v_pending
  from public.locations where status = 'pending';

  select count(*) into v_cu_place
  from public.locations where status = 'pending' and google_place_id is not null;

  raise notice 'Rămân % locații în așteptare, dintre care % au deja place id (le decizi manual, fără backfill).',
    v_pending, v_cu_place;
  raise notice 'De acum: locurile alese din Google intră direct ca aprobate; doar cele scrise de mână așteaptă.';
end $$;
