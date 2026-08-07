-- =====================================================================
-- Pocoloco — Călătorii promovate
--
-- Adminul poate marca o călătorie ca „featured"; secțiunea Recomandate
-- de pe homepage le arată pe acestea înaintea celor mai salvate.
-- =====================================================================

alter table public.trips
  add column if not exists featured boolean not null default false;

-- indexul acoperă exact sortarea din homepage: featured întâi, apoi salvări
create index if not exists trips_featured_idx
  on public.trips (featured desc, save_count desc);
