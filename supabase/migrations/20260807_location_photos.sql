-- =====================================================================
-- Pocoloco — Poze de copertă preluate din Google Places
--
-- `google_place_id` ne lasă să cerem poza mai târziu, fără să căutăm din
-- nou locul după nume. `cover_source` spune de unde vine imaginea, ca
-- pagina locației să poată da atribuirea corectă.
--
-- Rulează DUPĂ 20260806_location_approval.sql.
-- =====================================================================

alter table public.locations
  add column if not exists google_place_id text;

alter table public.locations
  add column if not exists cover_source text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'locations_cover_source_check') then
    alter table public.locations
      add constraint locations_cover_source_check
      check (cover_source is null or cover_source in ('user', 'google'));
  end if;
end $$;

-- căutăm locațiile fără poză dar cu place_id, la geocodarea retroactivă
create index if not exists locations_missing_cover_idx
  on public.locations (google_place_id)
  where cover_image is null and google_place_id is not null;
