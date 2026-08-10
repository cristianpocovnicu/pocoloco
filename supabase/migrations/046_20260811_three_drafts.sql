-- =====================================================================
-- Pocoloco — Trei povești neterminate, nu una
--
-- Migrarea 29 a pus un index unic pe `user_id`: „povestea la care lucrezi
-- acum". Dar oamenii se întorc din vacanță cu trei lucruri de spus și le
-- încep pe rând; cu un singur slot, a doua poveste o ștergea pe prima
-- printr-un `on conflict do update`, tăcut.
--
-- Limita nouă e 3. Nu se poate exprima printr-o constrângere — un `check`
-- nu poate număra rânduri din același tabel —, deci o ține un trigger
-- BEFORE INSERT care refuză al patrulea cu un mesaj citibil.
--
-- Ce NU face: nu șterge nimic. Drafturile existente sunt câte unul per
-- user, adică sub limită.
--
-- Rulează DUPĂ 029_20260808_creation_drafts.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Indexul unic pleacă
--
-- Cât timp există, al doilea draft ar fi respins de bază înainte să apuce
-- triggerul să numere.
-- ---------------------------------------------------------------------
drop index if exists public.creation_drafts_user_idx;

-- căutarea rămâne pe user, doar că nu mai e unică
create index if not exists creation_drafts_user_updated_idx
  on public.creation_drafts (user_id, updated_at desc);

-- ---------------------------------------------------------------------
-- 2. Limita
--
-- `security definer`: numărătoarea trebuie să vadă toate drafturile
-- userului, nu doar ce lasă RLS să treacă în contextul cererii.
--
-- Mesajul ajunge la client prin PostgREST și e citit de flux — de aceea
-- e o propoziție, nu un cod. `errcode` îl face recunoscibil fără să
-- comparăm textul.
-- ---------------------------------------------------------------------
create or replace function public.creation_drafts_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limita  constant integer := 3;
  v_existau integer;
begin
  select count(*) into v_existau
  from public.creation_drafts d
  where d.user_id = new.user_id;

  if v_existau >= v_limita then
    raise exception 'Ai atins limita de % povești neterminate. Termină una sau șterge-o.', v_limita
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists creation_drafts_limit_trg on public.creation_drafts;
create trigger creation_drafts_limit_trg
  before insert on public.creation_drafts
  for each row execute function public.creation_drafts_limit();

-- ---------------------------------------------------------------------
-- 3. Verificare
-- ---------------------------------------------------------------------
do $$
declare
  v_drafturi integer;
  v_useri    integer;
  v_peste    integer;
  v_unic     integer;
begin
  select count(*), count(distinct user_id) into v_drafturi, v_useri
  from public.creation_drafts;

  select count(*) into v_peste
  from (
    select user_id from public.creation_drafts group by user_id having count(*) > 3
  ) t;

  select count(*) into v_unic
  from pg_indexes
  where schemaname = 'public' and indexname = 'creation_drafts_user_idx';

  raise notice 'Drafturi: % rânduri, % useri. Peste limită: %.', v_drafturi, v_useri, v_peste;

  if v_unic > 0 then
    raise warning 'Indexul unic creation_drafts_user_idx încă există — al doilea draft ar fi respins.';
  else
    raise notice 'Indexul unic a fost scos; limita o ține acum triggerul (3 per user).';
  end if;
end $$;
