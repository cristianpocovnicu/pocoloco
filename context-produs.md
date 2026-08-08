# Pocoloco — context de produs

Ultima actualizare: **8 august 2026**

> Fișierul lipsea din repo când a fost cerut prima dată și a fost scris din
> istoricul real al deciziilor (commit-uri, migrări, docs). Structura pe
> capitole urmează numerotarea din prompturi (§3 flux, §4 alte decizii,
> §5 amânate, §6 ce urmează, §7 reguli de lucru). Dacă ai o versiune
> proprie mai bogată, a ta e sursa adevărului — trimite-o și o îmbin.

---

## 1. Ce e Pocoloco

O rețea de călătorie în română, în care valoarea stă în conținutul util:
locuri reale, povestite de oameni care au fost acolo. Dacă o funcție nu
ajută pe cineva să ia o decizie de călătorie mai bună, n-are ce căuta.

## 2. Cine scrie

Nu jurnaliști. Oameni care s-au întors dintr-o vacanță cu 40 de poze și
trei lucruri de spus. Fluxul de creare trebuie să funcționeze pentru cine
are cinci minute și chef de un paragraf, nu pentru cine vrea să publice un
ghid.

---

## 3. Fluxul de creare — istoric încheiat

Forma finală e implementată. Cele șase iterații de mai jos sunt istorie,
nu direcții deschise.

### Iterația 1 — două butoane la intrare *(înlocuită)*

`/create` întreba din start: „experiență" sau „călătorie". Userul trebuia
să știe vocabularul produsului înainte să scrie un cuvânt, iar cele două
drumuri nu se întâlneau niciodată: o experiență nu putea deveni parte
dintr-o călătorie fără să o iei de la capăt.

### Iterația 2 — călătoria ca listă de locuri *(înlocuită)*

`/trip/new` construia un itinerar din locuri, cu zile și note. Locurile
erau doar pin-uri: nimeni nu afla nimic despre ele, iar autorul scria de
două ori — o dată în itinerar, o dată în experiențe.

### Iterația 3 — călătoria ca album de recenzii *(păstrată)*

Opririle au devenit recenziile autorului: alegi dintre locurile despre
care ai scris deja, iar după publicare ești invitat să povestești despre
cele rămase goale. Ideea a rămas — se vede în `/trip/[id]`.

### Iterația 4 — un singur punct de intrare + activități *(păstrată)*

`/create` a devenit redirect, iar creația a primit o întrebare unică. Din
același câmp alegi un loc din Pocoloco, unul din Google, sau declari că nu
e un loc, e ceva ce ai făcut (`experiences.kind = 'activity'`, migrarea
27). Câștigul: tura cu buggy și scufundarea au încetat să mai fie forțate
într-un pin de pe hartă.

Ce a rămas prost după ea: cinci pași cu „Continuă", și nicăieri vreun
semn că mai poți adăuga un loc. Aflai de călătorie abia după publicare.

### Iterația 5 — ecran unic cu secțiuni expandate *(implementată)*

Un singur ecran vertical, fără pași și fără „înapoi":

- cardurile locurilor, primul cu **Poze**, **Cum a fost** și **Povestea și
  ponturile** deschise de la încărcare, fiecare marcat „(opțional)" — se
  vede din prima că nimic nu blochează publicarea;
- rândul „Ai mai făcut ceva în aceeași ieșire?", vizibil mereu, sub
  ultimul card;
- bara sticky de jos.

**De ce nu acumulatorul.** Alternativa aduna locuri și abia la final
întreba „vrei să le legăm într-o călătorie?". Are exact defectul
iterației 4: dezvăluie posibilitatea prea târziu, când omul a terminat de
scris și nu mai are chef să se întoarcă. Ecranul unic arată tot terenul de
la început, fără să ceară vreo decizie ca să începi.

### Iterația 6 — pasul 2 de finalizare *(implementată)*

Cu **un singur loc**, butonul spune „Publică" și publică direct. Cu **două
sau mai multe**, devine „Continuă" și deschide „Detaliile călătoriei":
nume, durată, transport, copertă, ziua fiecărui loc și reordonare.

**De ce.** Cardul detaliilor stătuse pe ecranul de povestit și îl aglomera
exact când erau mai multe locuri de citit. Iar ziua unui loc n-avea unde
să fie cerută: ca s-o alegi ai nevoie să vezi durata și lista locurilor
împreună. Același route și același state — doar altă stare a ecranului —
ca draftul să rămână unul singur.

### Regula de limbaj, în forma amendată

În flux nu apar cuvintele produsului: „experiență", „ghid", „itinerar",
nici „oprire" sau „obiectiv". Cardurile se numesc cu numele locului, iar
cât nu au unul, titlul e întrebarea („Unde ai fost?", „Ce ai mai
făcut?"). Se vorbește la persoana a doua.

**Excepția, una singură:** „călătorie" e permis în pasul 2, în cardul
„Detaliile călătoriei". Acolo se ajunge doar cu două locuri deja
povestite, adică după ce userul a înțeles din ce a făcut ce construiește.
Cuvântul numește rezultatul, nu îl anunță și nu cere o decizie.

Cuvintele produsului rămân libere în rezultat: pagina publicată,
toast-uri, restul aplicației.

### Ce a mai adus forma finală

- **`/trip/new` șters**, redirect spre `/add-experience`. Motivul: un al
  doilea drum de publicare înseamnă întreținere dublă și bug-uri tăcute —
  fiecare schimbare de schemă trebuia făcută în două locuri, iar cel
  neatins se strica în liniște. Odată cu el a plecat și
  `TellUsMorePrompt`, folosit doar acolo.
- **`experiences.status = 'draft'` nu se mai produce.** Comutatorul de
  vizibilitate a dispărut odată cu ecranul unic; verificat în bază, zero
  rânduri. Ciornele trăiesc în `creation_drafts` (migrarea 29), salvate
  automat, cu banner la revenire și card discret în profil. Filtrele care
  tratează draft-ul rămân pe loc, inofensive, pentru orice rând vechi.
- **Publicare tranzacțională** — `publish_story()` (migrarea 30): mai
  multe experiențe, călătoria și opririle ei intră împreună sau deloc.
- **Perioada vizitei** — „când ai fost", lună + an, ambele opționale (luna
  doar cu an), moștenită la locurile 2+ și modificabilă pe fiecare.
  Migrarea 34.
- **Copertele călătoriilor** — `cover_source` `user` / `auto`: dacă nu
  alegi una, se completează automat din prima poză de pe traseu, altfel
  din coperta primei locații care are una, la publicare și retroactiv
  (migrarea 33). Bonusul de 3 puncte se dă doar pentru coperta aleasă de
  om: sistemul nu se răsplătește singur.

### Iterația 7 — rutare prin natura selecției *(implementată, 8 august 2026)*

Între 6 și 7 a existat o încercare, **6b**: la alegerea unei zone apărea o
întrebare cu două opțiuni („ai fost în mai multe locuri" / „povestesc
despre zonă ca întreg"), plus un chip cu numele poveștii. A acumulat
edge case-uri la fiecare test — ce se randează cât timp întrebarea
așteaptă, ce se întâmplă cu selecția, cum se vede că alegerea a avut
efect, cum se editează numele rezultat.

Înlocuită cu **rutare prin natura selecției**. Primul ecran are o singură
căutare. Ce alege omul decide drumul:

- **un obiectiv** — loc din Pocoloco, loc din Google, activitate → scrii
  despre el, exact fluxul de până acum;
- **o zonă întreagă** — țară, regiune, formă de relief (detecția de
  `types` din iterația 6b, singura ei parte păstrată) → numele zonei
  devine numele poveștii, iar locurile se adaugă pe rând dedesubt. Zona
  **nu** ajunge în `locations`: n-are pin, n-are moderare, n-o poate
  recenza nimeni.

**De ce nu e bifurcația respinsă la iterația 3.** Aceea cerea userului o
decizie taxonomică conștientă — „experiență" sau „călătorie" — înainte să
scrie un cuvânt. Aici decizia o ia gestul lui natural: ce scrie în
căutare. Primul ecran rămâne o singură întrebare.

Ramificarea stabilește punctul de plecare, nu închide drumuri: din ambele
se ajunge la mai multe locuri.

### Iterația 8 — ecran unic pe journey *(implementată, 9 august 2026)*

Pasul 2 dispare. Tot ce ține de ieșirea întreagă — nume, poveste, zile,
transport, țări, copertă — coboară pe ecranul de povestit, deasupra
locurilor. Ziua fiecărui loc se alege de pe cardul lui, și doar când
ieșirea are mai mult de o zi.

*Motivul:* numele și povestea apăreau pe **ambele** ecrane, iar
despărțirea — cerută la iterația 6 tocmai ca să descarce ecranul —
ajunsese să dubleze exact subiectul pe care voia să-l descarce. Un singur
ecran, o singură dată fiecare câmp.

Ordinea de sus în jos: nume → poveste → „Detaliile călătoriei" →
„Locurile" → „+ Mai adaugă" → bara cu „Publică".

Secțiunea de detalii apare la două declanșatoare, nu unul: o poveste
pornită de la o zonă are nume de la început, iar una pornită de la un
obiectiv devine ieșire în momentul în care primește al doilea loc. Ramura
review cu un singur loc rămâne neatinsă: „Publică" direct.

**Decizie luată pe desktop, înainte de testul cu useri — de validat
acolo.**

---

## 4. Alte decizii

- **Moderarea locurilor.** Orice loc adăugat de un user intră `pending`.
  Fluxul nu așteaptă aprobarea: ce ai scris se salvează imediat.
- **Punctele nu se ating din UI.** Economia e descrisă în
  [`docs/economia-de-puncte.md`](./docs/economia-de-puncte.md) și se
  schimbă doar cu o migrare, niciodată ca efect secundar al unui ecran.
- **Zero regresie pe ce e publicat.** Paginile de rezultat (`/location`,
  `/experience`, `/trip`, editorul) nu se rescriu odată cu fluxul.
- **Vizitatorul nelogat vede tot conținutul public.** Nimic trunchiat,
  nimic blurat, niciun zid. Contul se cere exact în momentul unei acțiuni
  care are nevoie de el — vot, comentariu, salvare, urmărire — printr-un
  dialog scurt care duce la login sau înregistrare **cu revenire la pagina
  de origine** (`?next=`), nu cu un redirect sec pe acasă. Dispar pentru
  vizitator doar cele două secțiuni de homepage fără subiect fără cont:
  „Urmăresc" și „Ghizi de urmărit".
  *Motivul:* conținutul e marketingul. Fricțiunea la intrare alungă exact
  vizitatorul pe care SEO-ul îl aduce.
- **Căutarea e o listă unificată, fără taburi** (9 august 2026). Un singur
  termen întoarce Locuri, Călătorii, Activități și Oameni, în secțiuni
  verticale, primele cinci din fiecare, cu „Vezi toate (N)" care expandează
  inline; secțiunile goale nu apar.
  *Motivul:* taburile Locuri/Activități/Useri cereau alegerea tipului
  **înainte** de căutare — exact decizia taxonomică pe care fluxul de
  creare a eliminat-o la intrare (iterația 7). Omul nu știe dinainte dacă
  ce caută e „loc" sau „activitate"; motorul știe.
  Odată cu asta au dispărut și filtrele care nu filtrau: chips-urile de
  categorie (`locations.category` nu se completează nicăieri) și pragurile
  de notă 7+/8+/9+ (`locations.score` nu se calculează nicăieri). Toggle-ul
  Listă/Hartă a rămas, pe secțiunea de locuri, unde are sens.
- **Ștergerea unei locații din admin** e posibilă doar cât timp nu are
  experiențe scrise: acelea o cer prin schemă
  (`experiences_kind_target_check`), iar alternativa e respingerea, care o
  ascunde din căutare și feed păstrând conținutul. Opririle care arătau
  doar spre locul șters dispar, cu avertisment înainte de confirmare; cele
  cu poveste rămân în itinerar, fără pin (migrarea 36).

---

## 5. Amânate

Lucruri decise, dar nefăcute — niciunul nu blochează altceva.

| Ce | De ce e amânat |
|---|---|
| Ponturi salvabile individual | azi sunt un `text[]` pe experiență; ca să fie salvate și recompensate separat (1/5 în economia de puncte) au nevoie de tabel propriu |
| Salvarea unei experiențe (1/7 puncte) | `saves` acceptă doar locații și călătorii |
| Vot pe călătorie (1/3 puncte) | `votes` n-are `trip_id`; triggerul de puncte e deja scris să-l accepte în ziua în care coloana apare |
| Județe pe locații | pentru „X județe din 40" pe harta din profil; nu există coloana, vezi `supabase/checks/inspect_locations.sql` |
| Curățenie în Storage | pozele poveștilor abandonate rămân orfane; e nevoie de un job periodic peste `storage.objects` |
| Trip privat | toate călătoriile sunt publice, deci bonusul de +8 se acordă necondiționat până apare opțiunea |
| Full-text pe conținutul experiențelor | amânat până volumul o cere; azi recenziile se găsesc prin locul lor |
| Transport per segment (de la X la Y cu...) | granularitate pe care userii n-o completează; transportul rămâne la nivel de călătorie — mai multe mijloace, o singură dată, în metadate (migrarea 39) |
| Categorii pe locații (castele/natură/muzee...) | cere taxonomie + completare la creare + backfill; se decide după seed, când vedem ce categorii emerg real |
| Filtru pe notă în search | cere agregarea stelelor per loc; după volum |

---

## 6. Ce urmează

Features, UX și cod sunt declarate **finalizate în august 2026**.
Capitolul următor nu mai e despre produs, ci despre **vizibilitate și
conținut**.

1. **SEO tehnic.** Paginile publice sunt client-side: `/location/[id]`,
   `/trip/[id]`, `/experience/[id]` și homepage-ul își aduc conținutul din
   browser, deci un crawler vede aproape nimic. Există `generateMetadata`
   pe `/location`, `/trip` și `/profile` (prin `layout.tsx`), dar
   `/experience/[id]` n-are nici măcar atât. Lipsesc cu totul: `sitemap`,
   `robots`, JSON-LD și Search Console.
2. **Seed content.** Un produs de recenzii gol nu convinge pe nimeni și
   n-are ce indexa.
3. **Testul cu 5–7 oameni.** Pe fluxul real, pe telefoanele lor.
   Sarcină de observat, adăugată după iterația 8: **„publică o vacanță de
   5 zile cu 4 locuri — unde se împiedică?"** Ecranul unic n-a fost văzut
   decât pe desktop; acolo se vede dacă lungimea lui e o problemă.

---

## 7. Reguli de lucru

- **Un prompt pe rundă.** La finalul unei sesiuni cu mai multe prompturi,
  Claude Code raportează ce prompturi a primit și statusul fiecăruia.
  *De ce:* de două ori un prompt s-a pierdut tăcut între runde — o dată
  cel cu limbajul fluxului, o dată cel cu copertele — și s-a văzut abia
  câteva runde mai târziu.
- **Migrările le rulează omul, nu agentul.** Fișierele se scriu în
  `supabase/migrations/`, numerotate cu următorul număr liber pe trei
  cifre, și se rulează manual în SQL Editor. Numărul din nume e ordinea de
  rulare.
- **Codul câștigă în fața presupunerilor.** Când un prompt descrie ceva ce
  nu se potrivește cu ce e în repo, se implementează ce e corect și se
  semnalează diferența în raport.
- **Documentația se actualizează în aceeași rundă cu schimbarea**, nu
  „mai târziu": tabelul migrărilor, economia de puncte, fișierul ăsta.
