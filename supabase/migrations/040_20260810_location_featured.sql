-- =====================================================================
-- Pocoloco — Locații promovate
--
-- Până acum „Recomandate" de pe homepage putea conține doar călătorii
-- (migrarea 13). Dar un loc bun e la fel de recomandabil ca un traseu:
-- adminul primește aceeași acțiune și pe locații.
--
-- Promovarea e independentă de aprobare — o locație pending nu se
-- promovează (butonul nici nu apare), dar coloana nu impune asta:
-- homepage-ul cere oricum status = 'approved'.
--
-- Rulează DUPĂ 002_20260806_location_approval.sql.
-- =====================================================================

alter table public.locations
  add column if not exists featured boolean not null default false;

-- Index parțial: rândurile promovate sunt puține, iar interogarea le cere
-- pe toate, cele mai noi întâi. Un index pe toată tabela ar fi de zece mii
-- de ori mai mare degeaba.
create index if not exists locations_featured_idx
  on public.locations (created_at desc)
  where featured;

do $$
declare
  v_promovate integer;
begin
  select count(*) into v_promovate from public.locations where featured;
  raise notice 'locations.featured există; % locații sunt promovate acum.', v_promovate;
end $$;
