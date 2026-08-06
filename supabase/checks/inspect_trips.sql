-- =====================================================================
-- Verificare schemă înainte de migrarea 20260806_trips.sql
-- Rulează în Supabase → SQL Editor.
-- =====================================================================

-- 1. Coloanele tabelelor implicate
--    Aplicația se așteaptă la:
--      trip_locations: trip_id, location_id, day, note, position
--      saves:          user_id, location_id, trip_id
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('trips', 'trip_locations', 'saves')
order by table_name, ordinal_position;

-- 2. Constrângeri existente (unique / check / foreign key)
select conrelid::regclass as tabel, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.trips'::regclass,
  'public.trip_locations'::regclass,
  'public.saves'::regclass
);

-- 3. Triggere existente — dacă vreunul actualizează deja trips.save_count,
--    șterge-l înainte de migrare ca să nu se numere de două ori
select t.tgname, t.tgrelid::regclass as pe_tabelul, p.proname
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgrelid in (
    'public.trips'::regclass,
    'public.trip_locations'::regclass,
    'public.saves'::regclass
  );

-- 4. RLS și politici
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('trips', 'trip_locations', 'saves');

select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('trips', 'trip_locations', 'saves');

-- 5. Câte rânduri există deja
select 'trips' as tabel, count(*) from public.trips
union all select 'trip_locations', count(*) from public.trip_locations
union all select 'saves', count(*) from public.saves;

-- 6. Duplicate care ar bloca indexurile unice de la migrare
select user_id, location_id, count(*)
from public.saves where location_id is not null
group by 1, 2 having count(*) > 1;
