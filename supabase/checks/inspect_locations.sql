-- =====================================================================
-- Ce coloane are de fapt locations
--
-- Ne interesează în special dacă există o coloană de județ (`county`,
-- `judet`, `region`, `administrative_area`...). Statistica „X județe din
-- 40" de pe harta din profil are nevoie de ea; până atunci, harta se
-- oprește la număr de locuri și de țări.
--
-- Dacă găsești o astfel de coloană, spune-mi cum se numește și o
-- folosesc. Dacă nu există, o putem adăuga și popula la geocodare, din
-- `administrative_area_level_1` al răspunsului Google Places.
-- =====================================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'locations'
order by ordinal_position;

-- Coloane care ar putea ține județul, indiferent de nume
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'locations'
  and (
    column_name ilike '%count%'
    or column_name ilike '%judet%'
    or column_name ilike '%region%'
    or column_name ilike '%area%'
    or column_name ilike '%state%'
  );

-- Câte locații au coordonate — fără ele nu apar pe hartă
select
  count(*) as total,
  count(*) filter (where latitude is not null and longitude is not null) as cu_coordonate,
  count(*) filter (where country is not null and country <> '') as cu_tara,
  count(*) filter (where category is not null and category <> '') as cu_categorie
from public.locations;

-- Are `saves.location_id` cheie străină spre `locations`? Fără ea,
-- harta face două cereri în loc de una (vezi lib/travel-map.ts).
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.saves'::regclass and contype = 'f';
