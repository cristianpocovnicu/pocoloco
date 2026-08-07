# Economia de puncte

Implementarea documentului de design, cu ce s-a schimbat pe drum și ce a
rămas pentru faza 2.

---

## Cum funcționează, pe scurt

Totul trece printr-un singur tabel: **`points_ledger`**. Fiecare rând spune
cine a făcut o acțiune, cui i-a folosit și cât face. Punctele unui rând
merg către `coalesce(recipient_id, actor_id)`:

| actor_id | recipient_id | cine primește |
|---|---|---|
| Maria | `null` | Maria (a făcut ea acțiunea) |
| Maria | Ion | Ion (Maria i-a salvat călătoria) |

O interacțiune cu recompensă dublă scrie **două rânduri**, nu unul.

`profiles.points_total` și `profiles.points_level` sunt derivate din
registru printr-un trigger, deci nu pot ieși din sinc. Curba de nivel stă
în tabelul `point_levels`, ca UI-ul să n-o redefinească.

### Deduplicarea e în schemă, nu în cod

```
unique (actor_id, action_type, content_type, content_id, recipient_id, meta->>'dedup_key')
```

Unfollow + follow din nou, unsave + save din nou, votat și devotat: a
doua oară nu se mai plătește, pentru că insertul cade pe index. Nu e o
verificare pe care o poate uita cineva într-un `if`.

`dedup_key` din `meta` e pentru acțiunile care au voie să se repete
periodic — share-ul își pune acolo `platformă:data`, deci același conținut
poate fi plătit din nou mâine, dar nu de zece ori azi.

### Rata redusă pentru conturi noi

Un cont mai nou de 7 zile care n-are încă profil completat + o experiență
câștigă **jumătate** din punctele proprii (rotunjit în jos, dar minim 1,
ca acțiunile de 1 punct să nu pară că n-au făcut nimic). Punctele pe care
le primește cineva pentru conținutul lui **nu** sunt afectate de vârsta
celui care a interacționat.

---

## Migrările, în ordine

| # | Fișier | Ce face |
|---|---|---|
| 21 | `20260807_points_1_core.sql` | `points_ledger`, `point_levels`, `profiles.points_total/points_level`, `award_points()`, `award_interaction()` |
| 22 | `20260807_points_2_triggers.sql` | triggerele `points_*` pe locations, experiences, trips, votes, comments, saves, follows, profiles |
| 23 | `20260807_points_3_badges.sql` | `badges.points_reward`, insigne noi, condiții noi, `check_and_award_badges()` plătește milestone-ul |
| 24 | `20260807_points_4_shares.sql` | tabelul `shares` + `record_share()` |
| 25 | `20260807_points_5_referrals.sql` | `referral_code`, `referred_by`, `apply_referral_code()`, `maybe_reward_referral()` |
| 26 | `20260807_points_6_backfill.sql` | reconstruiește registrul din istoricul existent |

Ordinea contează: 2–6 depind de funcțiile din 1. Migrarea 6 se poate
rula de câte ori vrei — totul e `on conflict do nothing`.

---

## Tabelul de puncte, așa cum e implementat

### Postări

| Acțiune | Actor | Note |
|---|---|---|
| Locație nouă | 8 | 1× per locație |
| Experiență (bază) | 10 | doar la publicare, nu la draft |
| + locație | +3 | |
| + imagini | +4 | fix, indiferent câte poze |
| + text | +3 | |
| + ponturi | +5 | |
| + notare | +2 | |
| **Experiență completă** | **27** | |
| Călătorie (bază) | 20 | |
| + copertă | +3 | doar dacă e aleasă de user (`cover_source = 'user'`) |
| + rezumat (`description`) | +3 | |
| + publică | +8 | vezi nota despre trip privat |
| **Călătorie completă** | **34** | |

### Interacțiuni

| Acțiune | Actor | Autor | Plafon |
|---|---|---|---|
| Vot pozitiv pe experiență | 1 | 2 | 1× per experiență |
| Vot pozitiv pe comentariu | 1 | 1 | 1× per comentariu |
| Vot negativ | 0 | 0 | — |
| Comentariu | 3 | 3 | max 3 plătite / experiență / user |
| Răspunsul autorului la comentariu | 2 | 2 | max 5 plătite / experiență |
| Salvare călătorie | 1 | 10 | 1× per călătorie |
| „Vreau să merg" | 1 | — | 1× per locație |
| „Am fost" | 2 | — | 1× per locație |
| Mutare „vreau" → „am fost" | 3 | — | 1× per locație |
| Urmărire user | 2 | 5 | 1× per pereche, pe viață |
| Share extern | 2 | 15 | 1× / conținut / platformă / zi |
| Profil completat | 20 | — | o singură dată |
| Invitație reușită | 15 | — | max 10 pe viață |
| Bonus de bun venit (invitat) | 5 | — | o singură dată |

Retragerea unui vot **nu** retrage punctele deja date — altfel ar deveni o
armă („îți iau punctele").

Bonusul de copertă are o condiție în plus, din migrarea 33: o călătorie
fără copertă primește automat prima poză de pe traseu, ca să nu arate a
card gol. Aia e o completare a sistemului, nu o alegere a autorului, deci
nu se plătește — bonusul rămâne pentru cine chiar alege o imagine.

### Milestone-uri = insigne

Nu există un al doilea sistem paralel: milestone-urile din document sunt
insignele din `badges`, care au acum `points_reward`. Insignele noi:
5 călătorii (50), 10 și 25 de locuri vizitate (20 / 40), 5 și 10 țări
(40 / 75), 10 și 50 de urmăritori (20 / 50), 50 de voturi date (15), 100
de voturi primite (30).

Insignele care existau deja și nu apar în document au primit valori în
aceeași scară (50 de experiențe 60, 10 călătorii 60, 100 de urmăritori 80,
ghid verificat 50, prima urmărire 5) — altfel ar fi fost singurele
realizări care nu aduc nimic.

---

## Share extern

`record_share(content_type, content_id, platform)` e **singura** funcție de
puncte pe care o poate chema clientul. Sumele sunt fixate în corpul ei,
deci nimeni nu poate cere cât vrea.

Cine primește cele 15 puncte: doar conținutul cu autor clar —
**experiență** și **călătorie**. Locațiile n-au un singur autor, iar la
profiluri doi useri s-ar putea distribui reciproc în fiecare zi, deci
acolo se plătește doar actorul (2 puncte).

Linkul distribuit primește `?ref=CODUL_TĂU`, deci un share bun poate aduce
și un prieten, nu doar vizite.

---

## Invitații

1. Fiecare profil are un `referral_code` de 7 caractere (fără 0/O/1/I/L,
   ca să se poată citi la telefon).
2. `?ref=COD` de pe orice pagină se salvează în `localStorage` 30 de zile,
   iar parametrul e scos din bara de adrese — altfel linkul copiat mai
   departe ar trimite toată lumea la același invitator.
3. La prima navigare cu sesiune activă, aplicația cheamă
   `apply_referral_code()`. Funcția refuză codurile invalide, propriul cod
   și userii care au deja un invitator. Merge la fel pentru înregistrare cu
   email și pentru Google, pentru că nu depinde de fluxul de signup.
4. Recompensa se plătește abia când invitatul **termină onboarding-ul** ȘI
   face măcar o acțiune reală (o experiență, o salvare sau o urmărire).
   Triggerele verifică condiția în toate cele patru momente în care se
   poate îndeplini.

### Limitele anti-abuz, spuse pe față

Nu putem verifica IP-ul sau amprenta dispozitivului din client, deci
sistemul **nu** poate opri pe cineva care își face zece conturi de pe
același telefon. Ce avem:

- `referred_by` nu poate fi propriul cod și nu se poate rescrie;
- recompensa cere onboarding + o acțiune reală, nu doar un cont;
- maximum 10 invitații plătite pe viață;
- rata de 50% pe conturi noi face farmingul de conturi neinteresant.

Dacă apare abuz real, pasul următor e verificarea pe partea de server
(Edge Function cu IP + user agent), nu mai multă logică în client.

---

## Ce a rămas pentru faza 2

Lucruri din documentul de economie pentru care schema nu are încă suport.
Niciunul nu e blocat de altceva decât de funcția care lipsește din
aplicație:

- **Salvarea unei experiențe** (1 / 7) și **salvarea unui pont**
  (1 / 5) — `saves` acceptă doar locații și călătorii, iar ponturile sunt
  un `text[]` pe experiență, nu rânduri separate. Ponturile salvabile
  individual cer un tabel `tips` propriu.
- **Vot pe călătorie** (1 / 3) — `votes` are `experience_id` și
  `comment_id`, nu și `trip_id`. Triggerul e deja scris să acopere cazul:
  citește `trip_id` prin `to_jsonb(new)`, deci în ziua în care coloana
  apare, punctele curg fără altă modificare.
- **Follow locație** (1) — nu există.
- **Trip privat** — toate călătoriile sunt publice, deci bonusul de +8 se
  acordă oricărei călătorii activă. Când apare opțiunea, se schimbă o
  singură condiție în `points_after_trip()`.
- **Deblocările cosmetice** (ramă de avatar, temă de profil, colecții) —
  `point_levels.unlock` le ține deja ca text, dar nimic din aplicație nu
  le aplică. Regula rămâne: nicio funcție de bază nu se blochează după
  nivel.
- **Verificare GPS pentru „am fost acolo"** — ar aduce încredere, dar și
  fricțiune și o discuție de confidențialitate.
- **Cap zilnic de puncte** și **decay pe conținut vechi** — întrebări
  deschise din document, lăsate deschise.

---

## Verificări utile

```sql
-- clasamentul, cu nivel
select username, points_total, points_level
from public.profiles order by points_total desc limit 20;

-- de unde vin punctele cuiva
select action_type, count(*), sum(points)
from public.points_ledger
where coalesce(recipient_id, actor_id) = 'UUID'
group by 1 order by 3 desc;

-- cineva care câștigă suspect de repede
select coalesce(recipient_id, actor_id) as user_id, sum(points)
from public.points_ledger
where created_at > now() - interval '1 day'
group by 1 having sum(points) > 300 order by 2 desc;

-- totalurile chiar corespund registrului?
select p.username, p.points_total, coalesce(sum(l.points), 0) as din_registru
from public.profiles p
left join public.points_ledger l on coalesce(l.recipient_id, l.actor_id) = p.id
group by p.id, p.username, p.points_total
having p.points_total <> coalesce(sum(l.points), 0);
```

Ultima interogare trebuie să întoarcă **zero rânduri**. Dacă nu, rulează
`select public.recalc_points_total(id) from public.profiles;`.

---

## Dacă migrarea se oprește cu „function level_for_points(bigint) does not exist"

`sum()` întoarce **bigint**, iar Postgres nu îngustează singur argumentul
la `integer` când caută funcția — deci un apel de forma
`level_for_points(sum(points))` nu găsește nimic potrivit.

E rezolvat în două locuri:

- migrarea 6 castează totalul în subinterogare
  (`coalesce(sum(points), 0)::integer`);
- migrarea 1 definește și o variantă pe `bigint`, care doar deleagă către
  cea pe `integer`.

Dacă ai adăugat manual varianta pe bigint înainte, rularea din nou a
migrării 1 e în regulă: funcția e ștearsă și recreată, tocmai pentru că
`create or replace` n-ar putea schimba numele parametrului.

Aceeași capcană apare oriunde un agregat ajunge direct într-un apel de
funcție. Acolo unde rezultatul intră într-o variabilă sau într-o coloană
(`select count(*) into v_int`, `set comment_count = (select count(*) ...)`)
nu e nicio problemă: conversia de atribuire se face automat.
