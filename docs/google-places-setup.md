# Autocomplete de locații cu Google Places

La pasul 1 din `/add-experience`, câmpul de locație caută în două locuri deodată:

1. **locațiile aprobate din baza Pocoloco** — merge întotdeauna, fără nicio
   configurare;
2. **sugestii Google Places** — apar doar dacă există cheia de mai jos.

Fără cheie, aplicația funcționează normal: cauți printre locurile existente sau
scrii tu unul nou, care intră în moderare. Sub câmpul de căutare apare o notă
care explică asta. Nimic nu se strică — doar că nu primești sugestii din afara
bazei proprii.

Cu cheie, un loc ales din Google vine cu numele, orașul, țara și coordonatele
completate automat, iar locația nouă intră în moderare cu datele deja corecte.

---

## 1. Google Cloud Console

1. Intră pe <https://console.cloud.google.com/> și selectează proiectul (sau
   creează unul, ex. „Pocoloco").
2. **Billing** — Places API cere un cont de facturare activ pe proiect, chiar
   dacă rămâi în nivelul gratuit. Fără el, cheia răspunde cu eroare la fiecare
   cerere.
3. **APIs & Services → Library** → caută **Places API (New)** → **Enable**.
   - Atenție: sunt două produse cu nume aproape identic. Integrarea din cod
     folosește endpointurile noi (`places.googleapis.com/v1/...`), deci trebuie
     activat **Places API (New)**, nu „Places API" clasic.

---

## 2. Cheia, restricționată

**APIs & Services → Credentials → Create credentials → API key**

Imediat după creare, apasă **Edit API key** și pune ambele restricții:

**Application restrictions → Websites**, cu refererii:

```
https://pocoloco.travel/*
https://*.vercel.app/*
http://localhost:3000/*
```

A doua linie acoperă preview-urile de pe Vercel, a treia dezvoltarea locală.
Scoate-le pe amândouă când nu-ți mai trebuie.

**API restrictions → Restrict key** → bifează doar **Places API (New)**.

> Cheia ajunge în browser — de asta se numește `NEXT_PUBLIC_`. Nu există
> variantă „secretă" pentru autocomplete apelat din client; protecția reală
> sunt cele două restricții de mai sus. Cu ele, cheia nu poate fi folosită de
> pe alt domeniu și nu poate atinge alte servicii Google.

---

## 3. Unde se pune cheia

**Vercel → Project → Settings → Environment Variables:**

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | cheia de la pasul 2 | Production, Preview, Development |

Variabilele `NEXT_PUBLIC_*` sunt înghețate în bundle la build, deci **după ce o
adaugi trebuie să redeployezi** — nu e de ajuns să salvezi variabila.

Local, în `.env.local`:

```
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=cheia_ta
```

---

## 4. Verificare

1. Deschide `/add-experience` și scrie cel puțin 3 litere în câmpul de locație.
2. Ar trebui să vezi două feluri de rezultate, etichetate: **POCOLOCO** (din
   baza ta) și **GOOGLE** (sugestii noi).
3. Alege un rezultat Google: cardul de deasupra se completează cu numele,
   orașul și țara, iar eticheta devine „LOC NOU".
4. După publicare, verifică în Supabase → **Table editor → locations** că
   rândul nou are `latitude` și `longitude` completate.

### Dacă nu apar sugestii Google

| Simptom | Cauză uzuală |
|---|---|
| Doar rezultate POCOLOCO, plus nota din josul câmpului | Variabila lipsește din environment sau nu s-a făcut redeploy |
| Nimic, iar în consolă apare 403 | Restricția de referer nu acoperă domeniul de pe care testezi |
| Nimic, iar în consolă apare `REQUEST_DENIED` sau 400 | E activat „Places API" clasic în loc de **Places API (New)**, sau lipsește billing-ul |
| Merge local, nu merge pe Vercel | Domeniul de producție lipsește din restricții, sau variabila e doar pe Development |

Codul înghite erorile intenționat: dacă Google răspunde cu eroare, lista de
sugestii rămâne goală și căutarea în baza proprie continuă să funcționeze.
Verifică tabul Network din DevTools pentru cererea către
`places.googleapis.com` ca să vezi răspunsul exact.

---

## 5. Costuri

Autocomplete se facturează per sesiune, nu per tastă: codul generează un
`sessionToken` la începutul căutării și îl trimite și la cererea de detalii,
astfel încât tastările plus alegerea finală se numără ca o singură sesiune.
Cererea pleacă abia de la 3 caractere, cu 300ms de debounce.

Google are un nivel gratuit lunar; pentru un trafic mic nu ar trebui să
depășești. Pune oricum un **budget alert** în Cloud Console → Billing, ca să nu
afli dintr-o factură.
