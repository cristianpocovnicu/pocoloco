-- =====================================================================
-- Pocoloco — Ghiduri editoriale
--
-- Un ghid e o călătorie marcată, nu un obiect separat: aceleași coloane,
-- același itinerar, aceeași pagină. Diferă doar cine îl poate marca.
--
-- Protecția e prin trigger, nu prin RLS: politicile de update pe trips
-- verifică `author_id = auth.uid()`, deci un user și-ar putea marca
-- singur călătoria drept ghid fără să încalce vreo politică. Triggerul
-- prinde cazul indiferent de starea RLS.
--
-- Rulează DUPĂ 20260806_trips.sql.
-- =====================================================================

alter table public.trips
  add column if not exists is_guide boolean not null default false;

-- ---------------------------------------------------------------------
-- Doar adminii pot ridica sau coborî steagul
-- ---------------------------------------------------------------------
create or replace function public.trips_protect_guide_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() e null pentru service_role / SQL Editor: acolo lăsăm liber,
  -- ca seed-urile și scripturile de administrare să funcționeze
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_guide := false;
  else
    new.is_guide := old.is_guide;
  end if;

  return new;
end $$;

drop trigger if exists trips_protect_guide_flag_trg on public.trips;
create trigger trips_protect_guide_flag_trg
  before insert or update on public.trips
  for each row execute function public.trips_protect_guide_flag();

-- sortarea din „Recomandate": promovate, apoi ghiduri, apoi cele salvate
create index if not exists trips_featured_guide_idx
  on public.trips (featured desc, is_guide desc, save_count desc);
