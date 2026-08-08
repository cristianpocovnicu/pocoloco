-- =====================================================================
-- Pocoloco — Contorul de experiențe al unei locații, reparat
--
-- `locations.experience_count` e denormalizat și se actualiza printr-un
-- trigger scris în faza de scaffold, în afara migrărilor. Migrarea 2
-- avertiza deja: dacă funcția lui nu e SECURITY DEFINER, RLS o blochează
-- atunci când experiența e scrisă de altcineva decât cel care a adăugat
-- locul — politica `locations_update_own` cere `added_by = auth.uid()`.
-- Un UPDATE blocat de RLS nu dă eroare: pur și simplu nu prinde niciun
-- rând. Așa a rămas Fanal cu o experiență activă și contorul pe 0.
--
-- Reparația are trei părți:
--   1. un trigger care RECALCULEAZĂ, nu incrementează — dacă mai există
--      unul vechi care numără în paralel, rezultatul rămâne corect;
--   2. SECURITY DEFINER, ca RLS să nu-l mai poată tăia;
--   3. un backfill care pune toate contoarele pe adevăr.
--
-- Rulează DUPĂ 002_20260806_location_approval.sql.
-- Diagnostic înainte și după: supabase/checks/inspect_geography_and_counts.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funcția: numără, nu adună
-- ---------------------------------------------------------------------
create or replace function public.sync_location_experience_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_id  uuid;
begin
  -- la UPDATE se pot atinge două locații: cea veche și cea nouă
  v_ids := array_remove(array[
    case when tg_op in ('UPDATE', 'DELETE') then old.location_id end,
    case when tg_op in ('INSERT', 'UPDATE') then new.location_id end
  ], null);

  foreach v_id in array v_ids loop
    update public.locations l
    set experience_count = (
      select count(*)
      from public.experiences e
      where e.location_id = v_id
        and e.status = 'active'
    )
    where l.id = v_id;
  end loop;

  return null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Triggerul
--
-- AFTER, pe toate cele trei operații: o experiență ștearsă sau trecută pe
-- 'removed' trebuie să scadă contorul la fel de sigur cum îl urcă una nouă.
-- ---------------------------------------------------------------------
drop trigger if exists sync_location_experience_count_trg on public.experiences;
create trigger sync_location_experience_count_trg
  after insert or update or delete on public.experiences
  for each row execute function public.sync_location_experience_count();

-- ---------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------
do $$
declare
  v_gresite integer;
begin
  select count(*) into v_gresite
  from public.locations l
  where coalesce(l.experience_count, 0) <> (
    select count(*) from public.experiences e
    where e.location_id = l.id and e.status = 'active'
  );

  update public.locations l
  set experience_count = (
    select count(*) from public.experiences e
    where e.location_id = l.id and e.status = 'active'
  )
  where coalesce(l.experience_count, 0) <> (
    select count(*) from public.experiences e
    where e.location_id = l.id and e.status = 'active'
  );

  raise notice 'experience_count: % locații aveau contorul greșit, acum sunt toate pe adevăr.', v_gresite;
end $$;

-- ---------------------------------------------------------------------
-- 4. Ce a mai rămas de verificat cu ochiul
--
-- Dacă tot mai există un trigger vechi pe experiences care incrementa
-- contorul, acum e inofensiv (al nostru recalculează după el), dar poate
-- fi șters. Îl vezi cu interogarea 5 din fișierul de diagnostic.
-- ---------------------------------------------------------------------
do $$
declare
  v_altele integer;
begin
  select count(*) into v_altele
  from pg_trigger t
  where not t.tgisinternal
    and t.tgrelid = 'public.experiences'::regclass
    and t.tgname <> 'sync_location_experience_count_trg';

  raise notice 'Alte triggere pe experiences: %. Verifică-le cu inspect_geography_and_counts.sql.', v_altele;
end $$;
