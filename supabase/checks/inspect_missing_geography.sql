-- =====================================================================
-- Cine n-are geografie — și cine doar părea că n-are
--
-- Bannerul din /admin/locations număra „fără regiune" după o singură
-- coloană, `admin_area_1`. Dar sunt locuri care **sunt** propria
-- regiune: Google întoarce pentru ele localitate și țară, fără nivel 1.
-- Erau numărate ca stricate, butonul le rescria aceleași câmpuri, iar
-- bannerul nu pleca niciodată.
--
-- Definiția corectă e cea pe care o folosește chiar căutarea:
-- `search_locations` (migrarea 37) potrivește pe name, locality,
-- admin_area_1, admin_area_2 și country. Deci „are ce-i trebuie
-- căutării" = are măcar un nivel sub țară.
--
-- Nimic de aici nu modifică date.
-- =====================================================================

-- 1. Cele două numărători, una lângă alta
select
  count(*)                                                   as total,
  count(*) filter (where admin_area_1 is null)               as numara_bannerul_vechi,
  count(*) filter (
    where coalesce(admin_area_1, admin_area_2, locality) is null
  )                                                          as numara_bannerul_nou,
  count(*) filter (
    where admin_area_1 is null
      and coalesce(admin_area_2, locality) is not null
  )                                                          as fals_pozitive_reparate
from public.locations;

-- 2. Cazul concret: Tașkent (și orice altă capitală care e propria regiune)
select
  name, city, country, country_code,
  locality, admin_area_1, admin_area_2,
  google_place_id is not null as are_place_id,
  coalesce(admin_area_1, admin_area_2, locality) is not null as trece_definitia_noua
from public.locations
where name ilike '%tașkent%'
   or name ilike '%taskent%'
   or name ilike '%tashkent%'
   or city ilike '%tașkent%'
order by name;

-- 3. Tiparul „capitală fără admin_area_1" — București și restul
select
  name, city, country, locality, admin_area_1, admin_area_2,
  coalesce(admin_area_1, admin_area_2, locality) is not null as trece_definitia_noua
from public.locations
where admin_area_1 is null
  and locality is not null
order by country, locality, name
limit 100;

-- 4. Cine rămâne legitim gol după noua definiție — astea sunt singurele
--    pe care butonul mai are ce repara
select
  name, city, country, google_place_id is not null as are_place_id,
  latitude is not null as are_coordonate, created_at
from public.locations
where coalesce(admin_area_1, admin_area_2, locality) is null
order by created_at desc;
