# 🧭 Pocoloco

Platformă socială de travel — experiențe reale de la călători reali.

## Stack tehnic
- **Next.js 14** — framework React
- **Tailwind CSS** — stilizare
- **Supabase** — baza de date + autentificare
- **Vercel** — hosting

## Setup local (opțional)

```bash
npm install
cp .env.example .env.local
# completează variabilele din .env.local
npm run dev
```

## Deploy pe Vercel
1. Importă repo-ul în Vercel
2. Adaugă variabilele de mediu din `.env.example`
3. Deploy automat la fiecare push pe `main`

## Structura proiectului
```
src/
  app/           # Pagini Next.js
    page.tsx     # Home
    search/      # Căutare
    location/    # Pagina locație
    trip/        # Pagina călătorie
    profile/     # Profil utilizator
    add-experience/ # Adaugă experiență
    login/       # Autentificare
    register/    # Înregistrare
    onboarding/  # Onboarding
    admin/       # Panou administrare
  components/    # Componente reutilizabile
  lib/           # Utilități și configurări
  styles/        # CSS global
```

## Admin Dashboard
Accesibil la `/admin` — doar pentru utilizatorii cu rol de admin.

## Configurare
Migrările SQL, Realtime, storage și autentificarea cu Google necesită pași
manuali în Supabase și Google Cloud Console:

- [`docs/configurare-manuala.md`](docs/configurare-manuala.md) — toate migrările în ordine + restul setărilor
- [`docs/google-auth-setup.md`](docs/google-auth-setup.md) — autentificarea cu Google, pas cu pas
- [`docs/google-places-setup.md`](docs/google-places-setup.md) — sugestii de locații din Google Places (opțional)
