-- =====================================================================
-- Pocoloco — Economia de puncte (4/6): share extern cu tracking
--
-- Share-ul în afara aplicației e cel mai puternic semnal de calitate din
-- sistem: cineva îl arată unor oameni care nici măcar nu folosesc
-- Pocoloco. De asta autorul primește 15 puncte, cea mai mare recompensă
-- pe interacțiune.
--
-- Ca să nu devină o mașină de puncte, plata e limitată la o dată pe
-- conținut, pe platformă, pe zi. Limita stă în cheia de deduplicare
-- (`platform:data`), deci e impusă de index, nu de cod.
--
-- Rulează DUPĂ 20260807_points_1_core.sql.
-- =====================================================================

create table if not exists public.shares (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('experience', 'trip', 'location', 'profile')),
  content_id   uuid not null,
  platform     text not null check (platform in ('whatsapp', 'facebook', 'copy_link', 'native', 'other')),
  created_at   timestamptz not null default now()
);

create index if not exists shares_dedup_idx
  on public.shares (user_id, content_type, content_id, platform, ((created_at at time zone 'utc')::date));
create index if not exists shares_recent_idx  on public.shares (created_at desc);
create index if not exists shares_content_idx on public.shares (content_type, content_id, created_at desc);

alter table public.shares enable row level security;

-- Rândurile intră doar prin record_share() de mai jos. Fiecare își vede
-- share-urile, adminii le văd pe toate (cardul din /admin).
drop policy if exists "shares_select_own" on public.shares;
create policy "shares_select_own" on public.shares
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Înregistrează share-ul și plătește punctele
--
-- Singura funcție de puncte expusă clientului. Punctele sunt fixe în
-- corpul funcției, deci nimeni nu poate cere o sumă la alegere.
--
-- Recipientul (15 puncte) există doar pentru conținut cu autor clar:
-- experiență și călătorie. Locațiile n-au un singur autor, iar profilurile
-- ar deveni o buclă de schimb reciproc — acolo se plătește doar actorul.
-- ---------------------------------------------------------------------
create or replace function public.record_share(
  p_content_type text,
  p_content_id   uuid,
  p_platform     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := auth.uid();
  v_author   uuid;
  v_platform text := coalesce(p_platform, 'other');
  v_awarded  integer := 0;
begin
  if v_actor is null or p_content_id is null then
    return jsonb_build_object('ok', false, 'points', 0);
  end if;

  if p_content_type not in ('experience', 'trip', 'location', 'profile') then
    return jsonb_build_object('ok', false, 'points', 0);
  end if;

  if v_platform not in ('whatsapp', 'facebook', 'copy_link', 'native', 'other') then
    v_platform := 'other';
  end if;

  insert into public.shares (user_id, content_type, content_id, platform)
  values (v_actor, p_content_type, p_content_id, v_platform);

  if p_content_type = 'experience' then
    select author_id into v_author from public.experiences where id = p_content_id;
  elsif p_content_type = 'trip' then
    select author_id into v_author from public.trips where id = p_content_id;
  end if;

  v_awarded := public.award_points(
    v_actor, null, 'content_shared', p_content_type, p_content_id, 2,
    jsonb_build_object('dedup_key', v_platform || ':' || (now() at time zone 'utc')::date::text,
                       'platform', v_platform)
  );

  if v_author is not null and v_author <> v_actor then
    perform public.award_points(
      v_actor, v_author, 'content_shared', p_content_type, p_content_id, 15,
      jsonb_build_object('dedup_key', v_platform || ':' || (now() at time zone 'utc')::date::text,
                         'platform', v_platform)
    );
  end if;

  return jsonb_build_object('ok', true, 'points', v_awarded);
exception
  when others then
    -- share-ul e o acțiune de UI: nu are voie să dea eroare userului
    raise notice 'record_share: %', sqlerrm;
    return jsonb_build_object('ok', false, 'points', 0);
end $$;

grant execute on function public.record_share(text, uuid, text) to authenticated;
