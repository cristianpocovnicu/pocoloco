# Ce necesită configurare manuală

Tot ce nu se poate face din cod, într-un singur loc. Ordinea de mai jos e
ordinea în care trebuie făcute lucrurile.

---

## 1. Variabile de mediu

În Vercel (Project → Settings → Environment Variables) și în `.env.local`
pentru dezvoltare locală:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# opțional — fără ea, căutarea de locații merge doar în baza proprie
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=<cheie Places API (New)>
```

Primele două se găsesc în Supabase → Settings → API. Pentru a treia, vezi
[`google-places-setup.md`](./google-places-setup.md). `.env.local` e în
`.gitignore`, deci nu ajunge în repo.

Variabilele `NEXT_PUBLIC_*` sunt înghețate în bundle la build: după ce le
schimbi în Vercel, trebuie redeploy.

---

## 2. Migrări SQL

Rulează-le în **Supabase → SQL Editor**, în această ordine. Fiecare e
idempotentă — se poate rula din nou fără efecte secundare.

> **Regula pentru migrările noi:** fiecare migrare nouă primește
> următorul număr liber, cu 3 cifre, în numele fișierului:
> `NNN_data_nume.sql`. Numărul din nume e ordinea de rulare.

Fișierele din `supabase/checks/` nu sunt migrări — nu se numerotează și
nu schimbă nimic, doar citesc schema.

| # | Fișier | Ce face |
|---|--------|---------|
| 0 | `supabase/checks/inspect_comments.sql` | doar citește: îți arată schema `comments` înainte de migrarea 5 |
| 0 | `supabase/checks/inspect_trips.sql` | doar citește: schema `trips` / `trip_locations` / `saves` înainte de migrarea 8 |
| 1 | `supabase/migrations/001_20260806_admin_dashboard.sql` | `profiles.role` / `status`, funcția `is_admin()`, politici de moderare |
| 2 | `supabase/migrations/002_20260806_location_approval.sql` | status `pending` implicit pe locații, triggere, RLS |
| 3 | `supabase/migrations/003_20260806_votes.sql` | tabelul `votes`, trigger pentru contoare, RLS |
| 4 | `supabase/migrations/004_20260806_follows.sql` | tabelul `follows`, RLS |
| 5 | `supabase/migrations/005_20260806_comments.sql` | `parent_id`, trigger pentru `comment_count`, RLS |
| 6 | `supabase/migrations/006_20260806_notifications.sql` | tabelul `notifications` + triggerele care le generează |
| 7 | `supabase/migrations/007_20260806_profile_on_signup.sql` | profil automat la înregistrare (necesar pentru Google) |
| 8 | `supabase/migrations/008_20260806_trips.sql` | itinerar (`trip_locations`), salvarea călătoriilor, RLS pe `trips` / `saves` |
| 9 | `supabase/migrations/009_20260806_onboarding.sql` | `travel_styles`, `favorite_regions`, `onboarding_completed` pe `profiles` |
| 10 | `supabase/migrations/010_20260806_experience_owner.sql` | politici ca autorul să-și poată edita și șterge experiențele |
| 11 | `supabase/migrations/011_20260806_delete_user.sql` | funcția `delete_user()` — ștergerea contului din aplicație |
| 12 | `supabase/migrations/012_20260806_badges.sql` | `badges`, `user_badges`, `check_and_award_badges()` + triggere |
| 13 | `supabase/migrations/013_20260806_trip_featured.sql` | `trips.featured`, pentru promovarea din admin |
| 14 | `supabase/migrations/014_20260806_visits.sql` | `saves.status` — listele „Vreau să merg" / „Am fost" |
| 15 | `supabase/migrations/015_20260806_nearby.sql` | funcția `nearby_locations()` pentru secțiunea „În apropiere" |
| 16 | `supabase/migrations/016_20260806_trip_locations_fix.sql` | reconciliază `day` / `day_number`, altfel publicarea itinerariului crapă |
| 17 | `supabase/migrations/017_20260807_vote_effects.sql` | `net_score`, voturi pe comentarii, trigger unificat de contoare |
| 18 | `supabase/migrations/018_20260807_text_limits.sql` | coloanele lungi devin `text`, limita comentariilor urcă la 10.000 |
| 19 | `supabase/migrations/019_20260807_trip_guides.sql` | `trips.is_guide` + trigger care lasă doar adminii să-l seteze |
| 20 | `supabase/migrations/020_20260807_location_photos.sql` | `locations.google_place_id` + `cover_source`, pentru copertele luate din Google |
| 21 | `supabase/migrations/021_20260807_points_1_core.sql` | registrul de puncte, curba de nivel, `award_points()` |
| 22 | `supabase/migrations/022_20260807_points_2_triggers.sql` | triggerele care acordă punctele |
| 23 | `supabase/migrations/023_20260807_points_3_badges.sql` | insignele devin milestone-uri cu recompensă |
| 24 | `supabase/migrations/024_20260807_points_4_shares.sql` | tabelul `shares` + `record_share()` |
| 25 | `supabase/migrations/025_20260807_points_5_referrals.sql` | coduri de invitație și plata lor |
| 26 | `supabase/migrations/026_20260807_points_6_backfill.sql` | reconstruiește punctele din istoricul existent (rulează ultima) |
| 27 | `supabase/migrations/027_20260808_experience_kinds.sql` | `experiences.kind`: vizite la un loc vs. activități; `location_id` devine opțional |
| 28 | `supabase/migrations/028_20260808_trip_activity_stops.sql` | o oprire din itinerar poate fi o activitate, nu doar o locație |
| 29 | `supabase/migrations/029_20260808_creation_drafts.sql` | `creation_drafts` — povestea neterminată din ecranul de creare |
| 30 | `supabase/migrations/030_20260808_publish_story.sql` | `publish_story()` — publicarea, într-o singură tranzacție |
| 31 | `supabase/migrations/031_20260808_ratings_nullable.sql` | `rating_experience` devine opțional — notarea nu mai e obligatorie |
| 32 | `supabase/migrations/032_20260808_publish_story_array_guard.sql` | `images` / `tips`: array gol în loc de NULL, în `publish_story()` și în rândurile vechi |
| 33 | `supabase/migrations/033_20260808_trip_cover_auto.sql` | `trips.cover_source` + copertă completată automat din opriri, cu backfill |
| 34 | `supabase/migrations/034_20260808_visited_period.sql` | `visited_year` / `visited_month` — când a fost cineva acolo; actualizează și `publish_story()` |
| 35 | `supabase/migrations/035_20260808_publish_story_days.sql` | `publish_story()` scrie ziua aleasă pentru fiecare loc, nu toate pe ziua 1 |
| 36 | `supabase/migrations/036_20260808_location_delete_rules.sql` | reguli de ștergere pentru locații + `admin_delete_location()` |
| 37 | `supabase/migrations/037_20260809_location_geography.sql` | regiuni structurate pe locații, `unaccent` + `pg_trgm`, funcțiile de căutare |
| 38 | `supabase/migrations/038_20260809_publish_story_single_stop.sql` | `publish_story()`: verifică înainte de a scrie, iar călătoria se face de la prima oprire |
| 39 | `supabase/migrations/039_20260809_trip_transport_types.sql` | `trips.transport_types` — mai multe mijloace pe o călătorie; normalizează valorile vechi |
| 40 | `supabase/migrations/040_20260810_location_featured.sql` | `locations.featured` — locațiile intră și ele în „Recomandate" |
| 41 | `supabase/migrations/041_20260810_experience_count_fix.sql` | `locations.experience_count` recalculat de un trigger `security definer`, cu backfill |

Migrările 21–26 formează o serie: rulează-le în ordinea numerelor. Detalii
în [`economia-de-puncte.md`](./economia-de-puncte.md).

### Atenție la migrările 27–28 (activități)

27 face `experiences.location_id` opțional, ca o activitate („tură cu buggy")
să poată exista fără pin pe hartă. Un trigger care actualizează
`locations.experience_count` rămâne corect: cu `location_id` null, update-ul
lui nu prinde niciun rând. Dacă ai vreunul care presupune că locația există
(`select ... into strict`), ajustează-l — migrarea îți listează triggerele
de pe `experiences` într-un `notice`.

Ambele adaugă constrângerile ca `not valid`, apoi le validează separat: dacă
un rând nu se potrivește, primești un `notice` cu interogarea care ți-l
găsește, în loc ca migrarea să se oprească.

Ordinea contează: migrările 2–7 folosesc `is_admin()` din prima, iar 6 atașează
triggere pe tabelele create de 3, 4 și 5.

### După prima migrare — fă-ți contul admin

```sql
update public.profiles set role = 'admin' where username = 'username_tau';
```

Fără asta, `/admin` îți răspunde „Acces restricționat".

### Atenție la migrarea 2 (RLS pe `locations`)

Dacă ai un trigger care actualizează `locations.experience_count` când se
adaugă o experiență, funcția lui trebuie să fie `SECURITY DEFINER`, altfel RLS
o blochează. Fișierul conține query-ul care îți listează triggerele. Rollback
dacă ceva se blochează:

```sql
alter table public.locations disable row level security;
```

### Atenție la migrarea 5 (comentarii)

Rulează întâi `checks/inspect_comments.sql`. Dacă ai deja un trigger care
actualizează `experiences.comment_count`, șterge-l — altfel numărătoarea se
dublează.

### Atenție la migrarea 8 (călătorii)

Rulează întâi `checks/inspect_trips.sql`. Două lucruri de urmărit:

- ultima interogare din fișier îți arată salvările duplicate; dacă există,
  indexurile unice pe `saves` nu se creează (primești un `notice`, nu o
  eroare) — curăță duplicatele și rulează migrarea din nou
- `saves.location_id` devine opțional, ca un rând să poată referi în schimb o
  călătorie; constrângerea `saves_target_check` cere ca măcar una dintre
  `location_id` / `trip_id` să fie completată

---

### Atenție la migrarea 10 (experiențe)

Migrarea adaugă politicile, dar **nu pornește RLS** pe `experiences`.
Verifică întâi dacă e deja activat:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'experiences';
```

Dacă `rowsecurity` e `false`, oricine are cheia anon poate scrie în tabel — merită
pornit, dar abia după ce confirmi că politicile acoperă tot ce face aplicația:

```sql
alter table public.experiences enable row level security;
```

Testează imediat adăugarea unei experiențe. Rollback: `disable row level security`.

### Atenție la migrarea 11 (ștergerea contului)

Funcția rulează cu drepturi de owner și șterge exclusiv contul apelantului
(`auth.uid()`), deci nu poate fi folosită împotriva altcuiva. După ce o rulezi,
verifică dacă au rămas locații orfane — semn că `locations.added_by` e NOT NULL
și că locațiile aprobate ale userului șters au fost păstrate fără autor:

```sql
select count(*) from public.locations l
where l.added_by is not null
  and not exists (select 1 from auth.users u where u.id = l.added_by);
```

### Atenție la migrarea 14 (jurnalul de călătorie)

Extinde `saves`, tabelul folosit și pentru călătorii. Coloana nouă are default,
deci rândurile existente rămân valide și devin „Vreau să merg" — exact ce erau.
Triggerul de `save_count` pentru călătorii nu e atins.

### Atenție la migrarea 17 (efectele voturilor)

Înlocuiește triggerul de contoare de pe `votes` cu unul care știe și de
comentarii, și rescrie `notify_on_vote` ca să ignore voturile pe comentarii în
loc să crape pe un `experience_id` null. Rulează migrarea **înainte** de
deploy: până atunci, sortarea „Populare" de pe homepage și secțiunea
„Semnalate de comunitate" din admin nu au coloana `net_score` și rămân goale.

### Harta nu cere nimic

Leaflet + OpenStreetMap, fără cheie și fără cont. Singura obligație e atribuirea
„© OpenStreetMap", care e deja în hartă. Dacă traficul crește mult, politica de
utilizare a serverelor OSM cere un tile server propriu sau un serviciu plătit —
se schimbă un singur URL în `LocationMap.tsx`.

## 3. Realtime pentru notificări

Badge-ul de notificări din sidebar și din bara de jos se actualizează prin
Supabase Realtime. Migrarea 6 încearcă să adauge tabelul în publicație; dacă
primești un `notice` că publicația nu există:

1. Supabase → **Database → Replication** → activează Realtime
2. apoi rulează:
   ```sql
   alter publication supabase_realtime add table public.notifications;
   ```

Fără Realtime aplicația funcționează în continuare: contorul se recitește la
fiecare navigare, doar că nu se mai actualizează instantaneu.

---

## 4. Storage

Aplicația încarcă imagini (poze la experiențe, avatare) în bucket-ul `images`.

Supabase → **Storage** → bucket `images`:
- trebuie să existe și să fie **public** (linkurile sunt luate cu
  `getPublicUrl`)
- politici necesare: upload pentru useri autentificați, citire pentru toată
  lumea

Avatarele se salvează la `avatars/<user-id>/<timestamp>.<ext>`, pozele de la
experiențe la `experiences/<user-id>/...`, iar copertele preluate din Google
la `locations/<location-id>/cover.jpg`.

---

## 5. Autentificare cu Google

Pași detaliați în [`google-auth-setup.md`](./google-auth-setup.md). Pe scurt:
client OAuth în Google Cloud Console, Client ID + Secret în Supabase →
Authentication → Providers → Google, plus URL-urile aplicației în
Authentication → URL Configuration.

---

## 6. Ce nu e implementat

- **Apple Sign In** — butonul e dezactivat în interfață; necesită cont Apple
  Developer plătit.
- **Textele legale** din `/termeni` și `/confidentialitate` sunt un punct de
  plecare scris pentru acest produs, nu verificat de un avocat. Completează
  denumirea firmei operatoare și pune la punct `contact@pocoloco.travel`.
