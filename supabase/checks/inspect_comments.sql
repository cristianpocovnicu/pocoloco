-- =====================================================================
-- Verificare schemă înainte de migrarea 005_20260806_comments.sql
-- Rulează în Supabase → SQL Editor și uită-te la rezultate.
-- =====================================================================

-- 1. Ce coloane are tabelul comments?
--    Aplicația se așteaptă la: experience_id, author_id, content
--    (parent_id îl adaugă migrarea dacă lipsește)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'comments'
order by ordinal_position;

-- 2. Ce triggere există deja pe comments și pe experiences?
--    Dacă vezi deja un trigger care actualizează comment_count,
--    șterge-l înainte de migrare, altfel numărătoarea se dublează.
select t.tgname            as trigger_name,
       t.tgrelid::regclass as pe_tabelul,
       p.proname           as functia,
       pg_get_triggerdef(t.oid) as definitie
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgrelid in ('public.comments'::regclass, 'public.experiences'::regclass);

-- 3. Constrângeri existente (unique, check, foreign key)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.comments'::regclass;

-- 4. RLS e pornit pe comments? Ce politici există?
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'comments';

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'comments';

-- 5. Există deja comentarii?
select count(*) as total_comentarii from public.comments;
