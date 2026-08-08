-- =====================================================================
-- Diagnostic — geografia murdară și contorul de experiențe
-- Rulează în Supabase → SQL Editor. Nu modifică nimic.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. „România" parazit: țara scrisă nu se potrivește cu codul real
--
--    Fluxul completa `country` cu 'România' când Google nu dădea o țară.
--    Rândurile de mai jos sunt cele la care codul ISO spune altceva —
--    exact cazul „Egipt, România".
-- ---------------------------------------------------------------------
select
  id, name, city, country, country_code, locality, admin_area_1, admin_area_2,
  google_place_id is not null as are_place_id,
  status, created_at
from public.locations
where country_code is not null
  and upper(country_code) <> 'RO'
  and country = 'România'
order by created_at;

-- ---------------------------------------------------------------------
-- 2. Suspecte fără cod de țară (geografia n-a fost completată deloc)
--
--    Aici nu putem ști automat dacă „România" e adevărată. Semnalul e
--    `city`: dacă orașul e de fapt un nume de țară, rândul e murdar.
--    Lista de mai jos e scurtă și se citește cu ochiul.
-- ---------------------------------------------------------------------
select
  id, name, city, country, google_place_id is not null as are_place_id, created_at
from public.locations
where country_code is null
  and coalesce(country, '') = 'România'
order by created_at;

-- ---------------------------------------------------------------------
-- 3. Câte pot fi reparate automat
--
--    Cele cu place_id se corectează din /admin/locations, cu butonul
--    „Regiune" (acum rescrie și `city`, și `country`). Cele fără place_id
--    trec întâi prin „Găsește coordonatele".
-- ---------------------------------------------------------------------
select
  count(*) filter (where google_place_id is not null) as cu_place_id,
  count(*) filter (where google_place_id is null)     as fara_place_id
from public.locations
where (country_code is not null and upper(country_code) <> 'RO' and country = 'România')
   or (country_code is null and coalesce(country, '') = 'România');

-- ---------------------------------------------------------------------
-- 4. Contorul de experiențe: unde minte
--
--    `locations.experience_count` e denormalizat. Coloana din stânga e ce
--    scrie în ea, cea din dreapta e adevărul numărat acum.
-- ---------------------------------------------------------------------
select
  l.id,
  l.name,
  l.experience_count as scris,
  count(e.id) filter (where e.status = 'active') as real,
  l.status
from public.locations l
left join public.experiences e on e.location_id = l.id
group by l.id, l.name, l.experience_count, l.status
having coalesce(l.experience_count, 0) <> count(e.id) filter (where e.status = 'active')
order by count(e.id) filter (where e.status = 'active') desc;

-- ---------------------------------------------------------------------
-- 5. Cine ar trebui să țină contorul la zi
--
--    Dacă lista e goală, triggerul nu există deloc. Dacă există dar
--    `security_definer` e false, RLS îl blochează atunci când experiența
--    e scrisă de altcineva decât cel care a adăugat locul — updateul nu
--    dă eroare, doar nu prinde niciun rând. Ambele explică un contor
--    rămas pe 0. Migrarea 041 le rezolvă pe amândouă.
-- ---------------------------------------------------------------------
select
  t.tgname                       as trigger_name,
  t.tgrelid::regclass            as pe_tabelul,
  p.proname                      as functie,
  p.prosecdef                    as security_definer,
  pg_get_triggerdef(t.oid)       as definitie
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgrelid in ('public.experiences'::regclass, 'public.locations'::regclass)
order by t.tgrelid::regclass::text, t.tgname;
