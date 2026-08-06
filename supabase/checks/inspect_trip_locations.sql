-- =====================================================================
-- Ce coloane are de fapt trip_locations
--
-- Rulează asta ÎNAINTE de 20260806_trip_locations_fix.sql și trimite-mi
-- rezultatul dacă vezi coloane pe care aplicația nu le folosește.
--
-- Aplicația scrie în: trip_id, location_id, day_number, note, position
-- =====================================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'trip_locations'
order by ordinal_position;

-- Coloane NOT NULL fără default: exact cele care fac insertul să crape
-- dacă aplicația nu le completează.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'trip_locations'
  and is_nullable = 'NO'
  and column_default is null;

-- Constrângeri, în caz că mai există vreo regulă de care nu știm
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.trip_locations'::regclass;

-- Câte rânduri există și cum arată
select count(*) from public.trip_locations;
select * from public.trip_locations limit 5;
