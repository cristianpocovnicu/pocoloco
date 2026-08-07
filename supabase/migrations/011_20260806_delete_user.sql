-- =====================================================================
-- Pocoloco — Ștergerea contului din aplicație
--
-- Politica de confidențialitate promite dreptul la ștergere; până acum
-- se făcea manual, pe email. Funcția de mai jos șterge tot ce ține de
-- userul curent, inclusiv rândul din auth.users.
--
-- Rulează cu drepturile owner-ului (security definer), pentru că userul
-- obișnuit nu are voie să scrie în auth.users. Nu primește niciun
-- parametru: șterge exclusiv contul apelantului, deci nu poate fi
-- folosită ca să ștergi pe altcineva.
-- =====================================================================

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Trebuie să fii autentificat ca să îți ștergi contul.';
  end if;

  -- interacțiuni
  delete from public.votes         where user_id = uid;
  delete from public.follows       where follower_id = uid or following_id = uid;
  delete from public.notifications where user_id = uid or actor_id = uid;
  delete from public.saves         where user_id = uid;
  delete from public.comments      where author_id = uid;

  -- conținut propriu
  delete from public.experiences   where author_id = uid;
  delete from public.trip_locations where trip_id in (select id from public.trips where author_id = uid);
  delete from public.trips         where author_id = uid;

  -- Locațiile rămân ale comunității: experiențele altora depind de ele.
  -- Le desprindem de autor; dacă added_by e NOT NULL, ștergem doar
  -- locațiile care n-au apucat să fie aprobate.
  begin
    update public.locations set added_by = null where added_by = uid;
  exception when others then
    delete from public.locations where added_by = uid and status <> 'approved';
    raise notice 'locations.added_by nu acceptă null: am șters doar locațiile neaprobate ale userului %', uid;
  end;

  delete from public.profiles where id = uid;
  delete from auth.users     where id = uid;
end $$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

-- ---------------------------------------------------------------------
-- Verificare după rulare: dacă rămân locații aprobate care încă îl
-- referă pe un user șters, înseamnă că added_by e NOT NULL și trebuie
-- decis ce faci cu ele.
--   select count(*) from public.locations l
--   where l.added_by is not null
--     and not exists (select 1 from auth.users u where u.id = l.added_by);
-- ---------------------------------------------------------------------
