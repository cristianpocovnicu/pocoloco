-- =====================================================================
-- Pocoloco — Jurnal de călătorie: „Vreau să merg" și „Am fost"
--
-- Extindem `saves` cu o stare, în loc să adăugăm un tabel nou:
--   - indexul unic parțial (user_id, location_id) există deja, deci o
--     locație nu poate fi simultan în ambele liste — exclusivitatea vine
--     din schemă, nu din codul aplicației;
--   - trecerea dintr-o listă în alta e un UPDATE, nu delete + insert;
--   - rândurile pentru călătorii (trip_id) rămân neatinse, iar triggerul
--     de save_count nu se schimbă.
--
-- Rulează DUPĂ 20260806_trips.sql.
-- =====================================================================

alter table public.saves
  add column if not exists status text not null default 'want_to_go';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'saves_status_check') then
    alter table public.saves
      add constraint saves_status_check check (status in ('want_to_go', 'visited'));
  end if;
end $$;

-- listele din profil se citesc mereu filtrat pe user + stare
create index if not exists saves_user_status_idx on public.saves (user_id, status);
-- „cine a fost aici" pe pagina locației
create index if not exists saves_location_status_idx on public.saves (location_id, status)
  where location_id is not null;

-- ---------------------------------------------------------------------
-- RLS: până acum se putea doar insera și șterge; acum și actualiza,
-- pentru trecerea dintr-o listă în alta.
-- ---------------------------------------------------------------------
drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own" on public.saves
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Lista „Am fost" a cuiva e publică (apare pe profilul public); „Vreau să
-- merg" rămâne privată, deci citirea publică e limitată la vizitat.
drop policy if exists "saves_select_visited_public" on public.saves;
create policy "saves_select_visited_public" on public.saves
  for select using (status = 'visited' and location_id is not null);
