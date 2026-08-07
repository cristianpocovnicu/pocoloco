# Autentificare cu Google

Codul e gata: butonul „Continuă cu Google" din `/login` și `/register` apelează
`supabase.auth.signInWithOAuth({ provider: 'google' })`, iar `/auth/callback`
schimbă codul primit pe o sesiune. Ce urmează sunt pașii de configurare care
**nu se pot face din cod** — până nu-i faci, butonul răspunde cu
„Autentificarea cu Google nu e activată încă pe server."

---

## 1. Google Cloud Console

1. Intră pe <https://console.cloud.google.com/> și creează un proiect
   (ex. „Pocoloco") sau selectează unul existent.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Pocoloco`
   - User support email + Developer contact: emailul tău
   - App domain: `https://pocoloco.travel`
   - Authorized domains: adaugă `pocoloco.travel` și `supabase.co`
   - Scopes: lasă implicitele (`email`, `profile`, `openid`) — aplicația nu
     cere nimic în plus
   - Cât timp aplicația e „Testing", doar conturile din lista **Test users**
     se pot autentifica. Apasă **Publish app** când vrei să meargă pentru
     oricine.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Pocoloco Web`
   - **Authorized JavaScript origins**:
     ```
     https://pocoloco.travel
     http://localhost:3000
     ```
   - **Authorized redirect URIs** — aici se pune callback-ul *Supabase*, nu
     cel al aplicației:
     ```
     https://<PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     `<PROJECT-REF>` e subdomeniul din `NEXT_PUBLIC_SUPABASE_URL`.
4. Copiază **Client ID** și **Client Secret**.

---

## 2. Supabase Dashboard

1. **Authentication → Providers → Google**
   - Enable: **ON**
   - Client ID / Client Secret: cele de la pasul 1.4
   - Salvează.
2. **Authentication → URL Configuration**
   - **Site URL**: `https://pocoloco.travel`
   - **Redirect URLs** (adaugă toate variantele folosite):
     ```
     https://pocoloco.travel/auth/callback
     http://localhost:3000/auth/callback
     https://*-pocoloco.vercel.app/auth/callback
     ```
     Ultima linie acoperă preview-urile de pe Vercel. Fără intrarea potrivită
     aici, Supabase refuză redirectul după login și userul se întoarce la
     `/login?error=auth`.

---

## 3. Profilul userului

Userii care intră cu Google nu trec prin formularul de înregistrare, deci
nimeni nu le creează rândul din `public.profiles`. De asta se ocupă migrarea
`supabase/migrations/007_20260806_profile_on_signup.sql`: un trigger pe
`auth.users` care generează un username unic din email și preia numele și poza
din datele primite de la Google (`full_name` / `name`, `avatar_url` /
`picture`).

Rulează migrarea înainte de a testa login-ul cu Google, altfel userul intră în
cont dar rămâne fără profil.

---

## 4. Testare

1. Local: `npm run dev`, apoi `/login` → „Continuă cu Google".
2. După consimțământ ajungi pe `/auth/callback?code=...` și de acolo pe `/`.
3. Verifică în Supabase → **Table editor → profiles** că a apărut rândul, cu
   username și `full_name` completate.

### Dacă ceva nu merge

| Simptom | Cauză uzuală |
|---|---|
| „Unsupported provider: provider is not enabled" | Providerul Google e OFF în Supabase |
| `redirect_uri_mismatch` la Google | Lipsește `https://<ref>.supabase.co/auth/v1/callback` din Authorized redirect URIs |
| Te întorci pe `/login?error=auth` | URL-ul aplicației lipsește din Redirect URLs în Supabase |
| Intri în cont dar profilul e gol | Migrarea `007_20260806_profile_on_signup.sql` nu a fost rulată |
| Merge doar cu contul tău | Aplicația e „Testing" în consent screen — publică-o sau adaugă test users |

---

## Apple Sign In

Butonul există în interfață, dar e dezactivat (`Apple — în curând`). Necesită
cont Apple Developer plătit și configurare separată în Supabase; nu e
implementat.
