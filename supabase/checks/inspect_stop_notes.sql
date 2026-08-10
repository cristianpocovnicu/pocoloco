-- =====================================================================
-- Câte note per oprire mai există de fapt
--
-- Câmpul „Notă (opțional)" a ieșit din editarea călătoriei pe 12 august
-- 2026: fluxul de creare nu mai scrie note demult (`publishStory` nici
-- nu trimite câmpul), iar lângă un loc despre care omul are deja
-- poveste scrisă, o casetă goală arăta ca un text lipsă.
--
-- Coloana a rămas în schemă, iar notele vechi se afișează în continuare
-- pe pagina călătoriei — dar numai dacă mai există vreuna. Rulează
-- interogarea de mai jos și spune-mi numărul:
--
--   * peste 0 → afișarea rămâne cum e, nu atingem nimic;
--   * exact 0 → scot și afișarea din `/trip/[id]`, e cod mort care
--     ține un `ExpandableText` și o ramură de randare degeaba.
--
-- Nimic din ce e aici nu modifică date.
-- =====================================================================

-- 1. Numărul, pe scurt
select
  count(*) filter (where note is not null and btrim(note) <> '') as note_reale,
  count(*)                                                        as opriri_total,
  count(distinct trip_id) filter (where note is not null and btrim(note) <> '') as calatorii_cu_note
from public.trip_locations;

-- 2. Dacă numărul e peste 0: unde sunt, ca să vezi dacă merită păstrate
select
  t.id       as trip_id,
  t.title    as calatorie,
  t.status,
  l.name     as oprire,
  length(btrim(tl.note)) as lungime_nota,
  left(btrim(tl.note), 120) as inceputul_notei,
  tl.created_at
from public.trip_locations tl
join public.trips t on t.id = tl.trip_id
left join public.locations l on l.id = tl.location_id
where tl.note is not null and btrim(tl.note) <> ''
order by tl.created_at desc
limit 50;

-- 3. Câte dintre ele stau pe opriri care au și o poveste a autorului
--    (adică exact cazul care a scos câmpul din interfață: două locuri
--    pentru text la aceeași oprire)
select count(*) as note_pe_opriri_care_au_si_poveste
from public.trip_locations tl
join public.trips t on t.id = tl.trip_id
join public.experiences e
  on e.location_id = tl.location_id
 and e.author_id = t.author_id
 and e.status = 'active'
where tl.note is not null and btrim(tl.note) <> '';
