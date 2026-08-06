-- =====================================================================
-- Pocoloco — Limite de text generoase
--
-- Câmpurile lungi trebuie să fie `text`, nu varchar(n): o descriere de
-- călătorie tăiată la 255 de caractere e o limită tehnică scăpată în
-- produs, nu o decizie.
--
-- Migrarea convertește doar coloanele care chiar sunt varchar — dacă
-- sunt deja text, nu atinge tabelul.
-- =====================================================================

do $$
declare
  target record;
begin
  for target in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type = 'character varying'
      and (table_name, column_name) in (
        ('trips', 'description'),
        ('trips', 'title'),
        ('experiences', 'content'),
        ('locations', 'description'),
        ('profiles', 'bio'),
        ('comments', 'content'),
        ('trip_locations', 'note')
      )
  loop
    execute format(
      'alter table public.%I alter column %I type text',
      target.table_name, target.column_name
    );
    raise notice 'Convertit %.% la text', target.table_name, target.column_name;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Constrângerea de lungime pe comentarii: 2000 era prea strâns pentru
-- un răspuns argumentat.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'comments_content_check') then
    alter table public.comments drop constraint comments_content_check;
  end if;

  alter table public.comments
    add constraint comments_content_check check (char_length(content) between 1 and 10000);
exception when others then
  raise notice 'Nu am putut rescrie limita de lungime pe comments: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- Verificare: ce coloane de text mai au limită de lungime?
-- ---------------------------------------------------------------------
do $$
declare
  ramase text;
begin
  select string_agg(table_name || '.' || column_name || ' (' || character_maximum_length || ')', ', ')
    into ramase
  from information_schema.columns
  where table_schema = 'public'
    and data_type = 'character varying'
    and character_maximum_length is not null
    and table_name in ('trips', 'experiences', 'locations', 'profiles', 'comments', 'trip_locations');

  if ramase is not null then
    raise notice 'Coloane care încă au limită de lungime: %', ramase;
  end if;
end $$;
