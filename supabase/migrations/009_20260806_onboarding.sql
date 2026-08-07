-- =====================================================================
-- Pocoloco — Preferințe din onboarding
--
-- Până acum, pașii de onboarding nu salvau nimic: bifai stilurile de
-- călătorie și butonul „Continuă" era un simplu link către homepage.
-- Coloanele de mai jos dau unde să fie stocate.
-- =====================================================================

alter table public.profiles
  add column if not exists travel_styles text[] not null default '{}';

alter table public.profiles
  add column if not exists favorite_regions text[] not null default '{}';

-- ca să știm pe cine mai întrebăm și pe cine nu
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- conturile existente au trecut deja pe lângă onboarding
update public.profiles
  set onboarding_completed = true
  where onboarding_completed = false
    and created_at < now() - interval '1 hour';
