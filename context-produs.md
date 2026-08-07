# Pocoloco — context de produs

Ultima actualizare: **8 august 2026**

> Fișierul ăsta lipsea din repo când a fost cerut prima dată. E scris acum
> din istoricul real al deciziilor (commit-uri, migrări, docs), nu din
> memorie: fiecare iterație de mai jos are corespondent în cod. Dacă ai o
> versiune proprie, a ta e sursa adevărului — spune-mi și o îmbin.

---

## 1. Ce e Pocoloco

O rețea de călătorie în română, în care valoarea stă în conținutul util:
locuri reale, povestite de oameni care au fost acolo. Totul în produs
servește asta — dacă o funcție nu ajută pe cineva să ia o decizie de
călătorie mai bună, n-are ce căuta.

## 2. Cine scrie

Nu jurnaliști. Oameni care s-au întors dintr-o vacanță cu 40 de poze și
trei lucruri de spus. Fluxul de creare trebuie să funcționeze pentru cine
are cinci minute și chef de un paragraf, nu pentru cine vrea să publice un
ghid.

---

## 3. Istoricul deciziilor pe fluxul de creare

### Iterația 1 — două butoane la intrare *(înlocuită)*

`/create` întreba din start: „experiență" sau „călătorie". Userul trebuia
să știe vocabularul produsului înainte să scrie un cuvânt, iar cele două
drumuri nu se întâlneau niciodată: o experiență nu putea deveni parte
dintr-o călătorie fără să o iei de la capăt.

### Iterația 2 — călătoria ca listă de locuri *(înlocuită)*

`/trip/new` construia un itinerar din locuri, cu zile și note. Problema:
locurile erau doar pin-uri. Nimeni nu afla nimic despre ele, iar autorul
scria de două ori — o dată în itinerar, o dată în experiențe.

### Iterația 3 — călătoria ca album de recenzii *(implementată, păstrată)*

Opririle unei călătorii au devenit recenziile autorului: alegi dintre
locurile despre care ai scris deja, iar după publicare ești invitat să
povestești despre opririle rămase goale. Ideea a rămas — se vede și azi în
`/trip/[id]` și în promptul de după publicare.

### Iterația 4 — un singur punct de intrare + activități *(implementată)*

`/create` a devenit redirect, iar wizardul a primit o întrebare unică:
„despre ce e povestea ta?". Din același câmp puteai alege un loc din
Pocoloco, unul din Google, sau declara că nu e un loc, e ceva ce ai făcut
(`experiences.kind = 'activity'`, migrarea 27). Câștigul: jumătate din ce
ține minte omul dintr-o vacanță — tura cu buggy, scufundarea — a încetat
să mai fie forțat într-un pin de pe hartă.

Ce a rămas prost: wizardul avea în continuare cinci pași cu „Continuă", și
nu spunea niciodată că mai poți adăuga o oprire. Aflai de călătorie abia
după publicare, din dialogul „o adaugi într-o călătorie?".

### Iterația 5 — ecran unic cu secțiuni colapsate *(implementată, 8 august 2026)*

Un singur ecran vertical care crește: prima oprire sus, sub ea invitația
„ai mai fost undeva în aceeași ieșire?", iar sub ea cardul cu detaliile
ieșirii, vizibil dar blocat până există a doua oprire. Poze, note și
poveste sunt rânduri care se deschid la nevoie, niciunul obligatoriu.

**De ce nu acumulatorul.** Varianta alternativă era un flux care aduna
opriri și abia la final întreba „vrei să le legăm într-o călătorie?".
Dezavantajul e același cu al iterației 4: dezvăluie posibilitatea prea
târziu, când omul a terminat deja de scris și nu mai are chef să se
întoarcă. Ecranul unic arată tot terenul de la început — se vede că se
poate mai mult — dar nu cere nicio decizie ca să începi. Butonul e unul
singur, „Publică", iar ce iese (o experiență sau o ieșire cu mai multe
opriri) se decide din ce ai scris, nu dintr-un meniu.

**Reguli de limbaj**, valabile de aici înainte: în flux nu apar cuvintele
„experiență", „călătorie", „ghid", „itinerar". Apar în rezultat — pagina
publicată, toast-uri, restul aplicației. În flux se vorbește la persoana a
doua: „unde ai fost", „ce ai făcut", „ai mai fost undeva". Nici „oprire"
sau „obiectiv" nu apar: cardurile se numesc cu numele locului, iar cât nu
are unul, titlul e întrebarea.

**Amendament (8 august 2026):** „călătorie" e permis într-un singur loc —
cardul „Detaliile călătoriei". Acolo se ajunge doar cu două locuri deja
adăugate, adică după ce userul a înțeles din ce a făcut ce construiește;
cuvântul numește rezultatul, nu îl anunță și nu-i cere o decizie. În rest
interdicția rămâne întreagă, iar „experiență", „ghid" și „itinerar" rămân
interzise peste tot în flux.

**Ce a adus în plus:** povești neterminate (`creation_drafts`, migrarea
29), salvate automat, cu banner la revenire și card discret în profil;
publicare tranzacțională (`publish_story()`, migrarea 30) — mai multe
experiențe, o ieșire și opririle ei intră împreună sau deloc.

### Iterația 6 — detaliile mutate într-un pas de finalizare *(implementată, 8 august 2026)*

Cardul „Detaliile călătoriei" a stat o vreme pe ecranul de povestit, sub
locuri. Două probleme: aglomera ecranul exact când erau mai multe locuri
de citit, și nu exista unde să ceri ziua fiecărui loc — ca s-o alegi ai
nevoie să vezi durata și lista locurilor în același loc.

Acum ecranul 1 rămâne doar cardurile locurilor plus invitația de a mai
adăuga unul. Cu un singur loc, butonul publică direct, ca până acum. Cu
două sau mai multe, devine „Continuă" și duce la pasul 2: nume, durată,
transport, copertă și lista locurilor, fiecare cu un selector de zi
opțional. Același route și același state — doar altă stare a ecranului —
ca draftul să rămână unul singur și „Continuă mai târziu" să funcționeze
identic din ambele.

Zilele se scriu în `trip_locations.day_number` la publicare (migrarea 35),
doar unde au fost alese. Dacă durata scade sub o zi deja aleasă, ziua se
golește cu un mesaj discret în loc să rămână o valoare imposibilă.

---

## 4. Ce nu se schimbă

- **Moderarea locurilor.** Orice loc adăugat de un user intră `pending`.
  Fluxul nu așteaptă aprobarea: ce ai scris se salvează imediat.
- **Punctele nu se ating din UI.** Economia e descrisă în
  [`docs/economia-de-puncte.md`](./docs/economia-de-puncte.md) și se
  schimbă doar cu o migrare, niciodată ca efect secundar al unui ecran.
- **Zero regresie pe ce e publicat.** Paginile de rezultat (`/location`,
  `/experience`, `/trip`, editorul de călătorie) nu se rescriu odată cu
  fluxul de creare.

---

## 5. Vocabular

| În produs | În cod / DB |
|---|---|
| poveste, oprire, ieșire | `experiences`, `trip_locations`, `trips` |
| loc | `locations` (moderate) |
| activitate | `experiences.kind = 'activity'` |
| ghid | `trips.is_guide`, doar admin |

---

## 6. Ce urmează

1. **Ponturi salvabile individual** — azi sunt un `text[]` pe experiență.
   Ca să poată fi salvate și recompensate separat (1/5 în economia de
   puncte) au nevoie de tabel propriu.
2. **Salvarea unei experiențe** (1/7 puncte) — `saves` acceptă doar
   locații și călătorii.
3. **Vot pe călătorie** — `votes` n-are `trip_id`; triggerul de puncte e
   deja scris să-l accepte în ziua în care coloana apare.
4. **Județe pe locații** — pentru „X județe din 40" pe harta din profil.
   Vezi `supabase/checks/inspect_locations.sql`.
5. **Curățenie în Storage** — pozele din poveștile abandonate rămân
   orfane. Un job periodic peste `storage.objects`, comparat cu
   `experiences.images` și cu draft-urile active.
6. **Trip privat** — toate ieșirile sunt publice; bonusul de +8 se acordă
   necondiționat până apare opțiunea.
