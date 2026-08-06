-- =====================================================================
-- Pocoloco — Profil automat la înregistrare (inclusiv prin Google)
--
-- Userii care intră cu Google nu trec prin formularul de register, deci
-- nimeni nu le creează rândul din public.profiles. Fără el, aplicația
-- n-are username (deci nici /profile/[username]) și nici nume de afișat.
--
-- Migrarea e ADITIVĂ, nu înlocuiește nimic:
--   - dacă ai deja un trigger care creează profilul, al nostru se
--     numește 'zz_...' ca să ruleze DUPĂ el și devine no-op
--     (insert ... on conflict (id) do nothing)
--   - dacă insertul eșuează din orice motiv, eroarea e înghițită, ca să
--     nu blocheze niciodată înregistrarea
--
-- Verifică ce triggere ai deja pe auth.users:
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--   where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- =====================================================================

create or replace function public.ensure_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  baza     text;
  candidat text;
  sufix    int := 0;
  nume     text;
begin
  -- username: din metadate, altfel din partea locală a emailului
  baza := lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  ));
  baza := regexp_replace(baza, '[^a-z0-9._]', '', 'g');
  if baza = '' then
    baza := 'calator';
  end if;
  baza := left(baza, 20);

  candidat := baza;
  while exists (select 1 from public.profiles where username = candidat) loop
    sufix := sufix + 1;
    candidat := baza || sufix::text;
    exit when sufix > 1000;
  end loop;

  -- Google trimite numele în 'full_name' sau 'name', poza în
  -- 'avatar_url' sau 'picture'
  nume := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    candidat
  );

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    candidat,
    nume,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- niciodată nu blocăm signup-ul pentru un profil care n-a intrat
    raise notice 'ensure_profile_for_new_user: profilul nu a putut fi creat pentru %: %', new.id, sqlerrm;
    return new;
end $$;

-- Numele începe cu zz_ intenționat: triggerele rulează în ordine
-- alfabetică, deci al nostru vine ultimul și nu se bate cu unul existent.
drop trigger if exists zz_ensure_profile_trg on auth.users;
create trigger zz_ensure_profile_trg
  after insert on auth.users
  for each row execute function public.ensure_profile_for_new_user();

-- ---------------------------------------------------------------------
-- Completează profilurile rămase fără rând (useri creați înainte)
-- ---------------------------------------------------------------------
insert into public.profiles (id, username, full_name)
select u.id,
       left(regexp_replace(lower(split_part(coalesce(u.email, 'calator'), '@', 1)), '[^a-z0-9._]', '', 'g'), 20)
         || '_' || left(replace(u.id::text, '-', ''), 6),
       coalesce(
         nullif(u.raw_user_meta_data ->> 'full_name', ''),
         nullif(u.raw_user_meta_data ->> 'name', ''),
         split_part(coalesce(u.email, 'Călător'), '@', 1)
       )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
