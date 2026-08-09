-- =====================================================================
-- Pocoloco — Clopoțelul sună și pentru moderare
--
-- Badge-urile din interfață spun *câte* lucruri așteaptă; emailul ajunge
-- și când aplicația e închisă. Lipsea mijlocul: un rând în clopoțel, cu
-- numele locului, la un click de lista de moderare.
--
-- Notificarea nu e „a ta" în sensul celorlalte (cineva ți-a votat, cineva
-- te-a urmărit) — e o treabă de făcut. Merge totuși prin același tabel:
-- același canal realtime, aceeași pagină, aceeași marcare ca citit.
--
-- Rulează DUPĂ 006_20260806_notifications.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Constrângerile: tipul nou și entitatea nouă
--
-- Migrarea 6 le-a scris ca liste închise. Le rescriem cu valorile în plus,
-- fără să atingem rândurile existente.
-- ---------------------------------------------------------------------
do $$
begin
  alter table public.notifications drop constraint if exists notifications_type_check;
  alter table public.notifications
    add constraint notifications_type_check
    check (type in ('upvote', 'follow', 'comment', 'reply', 'location_pending'));

  alter table public.notifications drop constraint if exists notifications_entity_type_check;
  alter table public.notifications
    add constraint notifications_entity_type_check
    check (entity_type in ('experience', 'comment', 'user', 'location'));
end $$;

-- ---------------------------------------------------------------------
-- 2. Anti-dublură
--
-- O locație = o notificare per admin, o singură dată. Indexul e parțial,
-- ca la 'upvote'/'follow' din migrarea 6, deci nu atinge celelalte tipuri.
--
-- `actor_id` lipsește din cheie intenționat: cine a propus locul nu
-- schimbă faptul că e același loc de aprobat. Iar un `actor_id` null
-- (locații din seed) ar fi rupt unicitatea, pentru că NULL nu se compară
-- cu NULL.
-- ---------------------------------------------------------------------
create unique index if not exists notifications_location_pending_idx
  on public.notifications (user_id, type, entity_id)
  where type = 'location_pending';

-- ---------------------------------------------------------------------
-- 3. Triggerul
--
-- `security definer`: rândurile se scriu pentru alți useri decât cel care
-- a adăugat locul, iar RLS nu-i dă nimănui voie să insereze notificări —
-- exact ca la celelalte triggere de notificare din migrarea 6.
--
-- Prinde și `update of status`, nu doar inserarea: adminii pot trimite o
-- locație înapoi în așteptare din /admin/locations (butonul „În
-- așteptare"), iar acela e tot un loc de aprobat. Indexul de mai sus face
-- ca al doilea drum să nu producă un al doilea rând.
-- ---------------------------------------------------------------------
create or replace function public.notify_admins_location_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'pending' then
    return null;
  end if;

  -- la UPDATE ne interesează doar trecerea în pending, nu orice atingere
  if tg_op = 'UPDATE' and old.status = 'pending' then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
  select p.id, new.added_by, 'location_pending', 'location', new.id
  from public.profiles p
  where p.role = 'admin'
    -- adminul care adaugă un loc știe deja despre el
    and p.id is distinct from new.added_by
  on conflict do nothing;

  return null;
exception when others then
  -- ca la puncte: anunțul nu are voie să strice adăugarea locului
  raise notice 'notify_admins_location_pending: %', sqlerrm;
  return null;
end $$;

drop trigger if exists notify_admins_location_pending_trg on public.locations;
create trigger notify_admins_location_pending_trg
  after insert or update of status on public.locations
  for each row execute function public.notify_admins_location_pending();

-- ---------------------------------------------------------------------
-- 4. Ce așteaptă deja
--
-- Locațiile aflate acum în pending au intrat înainte să existe triggerul.
-- Fără asta, clopoțelul ar tăcea exact despre ce e de făcut azi.
-- ---------------------------------------------------------------------
do $$
declare
  v_locatii integer;
  v_randuri integer;
begin
  select count(*) into v_locatii from public.locations where status = 'pending';

  insert into public.notifications (user_id, actor_id, type, entity_type, entity_id, created_at)
  select p.id, l.added_by, 'location_pending', 'location', l.id, l.created_at
  from public.locations l
  cross join public.profiles p
  where l.status = 'pending'
    and p.role = 'admin'
    and p.id is distinct from l.added_by
  on conflict do nothing;

  get diagnostics v_randuri = row_count;

  raise notice 'Moderare: % locații în așteptare, % notificări create (restul existau deja).',
    v_locatii, v_randuri;
end $$;

do $$
declare
  v_admini integer;
begin
  select count(*) into v_admini from public.profiles where role = 'admin';
  if v_admini = 0 then
    raise warning 'Niciun cont cu role = ''admin'': notificările de moderare n-au destinatar.';
  else
    raise notice 'Destinatari: % conturi de admin.', v_admini;
  end if;
end $$;
