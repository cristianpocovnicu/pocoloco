-- =====================================================================
-- Pocoloco — Economia de puncte (5/6): invitații
--
-- Fiecare user are un cod. Cine intră prin linkul lui devine „invitat".
-- Recompensa NU se dă la înregistrare — altfel s-ar putea fabrica
-- conturi goale — ci abia când invitatul termină onboarding-ul ȘI face
-- măcar o acțiune reală: o experiență, o salvare sau o urmărire.
--
-- Invitatorul: 15 puncte, maximum 10 invitații plătite pe viață.
-- Invitatul:    5 puncte bonus de bun venit.
--
-- Rulează DUPĂ 20260807_points_1_core.sql și 20260806_onboarding.sql.
-- =====================================================================

alter table public.profiles add column if not exists referral_code     text;
alter table public.profiles add column if not exists referred_by       uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_rewarded boolean not null default false;

-- ---------------------------------------------------------------------
-- 1. Generarea codului — 7 caractere, fără cele care se confundă la
--    citit (0/O, 1/I/L)
-- ---------------------------------------------------------------------
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabet   text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_cod       text;
  v_i         integer;
  v_incercare integer;
begin
  for v_incercare in 1..20 loop
    v_cod := '';
    for v_i in 1..7 loop
      v_cod := v_cod || substr(v_alfabet, 1 + floor(random() * length(v_alfabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = v_cod);
  end loop;
  return v_cod;
end $$;

-- Coduri pentru conturile existente, rând cu rând: într-un singur UPDATE
-- verificarea de unicitate din funcție n-ar vedea codurile generate în
-- aceeași comandă și am putea produce două la fel.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles
       set referral_code = public.generate_referral_code()
     where id = r.id;
  end loop;
end $$;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code) where referral_code is not null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by) where referred_by is not null;

-- cod pentru conturile noi
create or replace function public.profiles_set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end $$;

drop trigger if exists profiles_referral_code_trg on public.profiles;
create trigger profiles_referral_code_trg
  before insert on public.profiles
  for each row execute function public.profiles_set_referral_code();

-- ---------------------------------------------------------------------
-- 2. Codul și invitatorul nu se pot rescrie din client
-- ---------------------------------------------------------------------
create or replace function public.profiles_protect_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- codul propriu e imuabil
  if old.referral_code is not null then
    new.referral_code := old.referral_code;
  end if;

  -- invitatorul se scrie o singură dată și niciodată către tine însuți
  if old.referred_by is not null then
    new.referred_by := old.referred_by;
  elsif new.referred_by = new.id then
    new.referred_by := null;
  end if;

  -- referral_rewarded rămâne scriibil intenționat: nu el ține plata sub
  -- control, ci indexul unic din points_ledger. Chiar dacă cineva îl
  -- resetează, punctele nu se dau a doua oară.

  return new;
end $$;

drop trigger if exists profiles_protect_referral_trg on public.profiles;
create trigger profiles_protect_referral_trg
  before update on public.profiles
  for each row execute function public.profiles_protect_referral();

-- ---------------------------------------------------------------------
-- 3. Aplicarea unui cod, chemată din aplicație după înregistrare
-- ---------------------------------------------------------------------
create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_inviter uuid;
begin
  if v_user is null or coalesce(btrim(p_code), '') = '' then
    return jsonb_build_object('ok', false);
  end if;

  -- deja invitat de cineva: nu se schimbă
  if exists (select 1 from public.profiles where id = v_user and referred_by is not null) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  select id into v_inviter
  from public.profiles
  where referral_code = upper(btrim(p_code));

  if v_inviter is null or v_inviter = v_user then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.profiles set referred_by = v_inviter where id = v_user;

  -- poate a apucat deja să facă tot ce trebuie
  perform public.maybe_reward_referral(v_user);
  return jsonb_build_object('ok', true);
exception
  when others then
    raise notice 'apply_referral_code: %', sqlerrm;
    return jsonb_build_object('ok', false);
end $$;

grant execute on function public.apply_referral_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Plata invitației — o singură dată, când invitatul devine activ
-- ---------------------------------------------------------------------
create or replace function public.maybe_reward_referral(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter  uuid;
  v_rewarded boolean;
  v_onboard  boolean;
  v_activ    boolean;
  v_platite  integer;
begin
  if p_user_id is null then return; end if;

  select referred_by, referral_rewarded, coalesce(onboarding_completed, false)
    into v_inviter, v_rewarded, v_onboard
  from public.profiles
  where id = p_user_id;

  if v_inviter is null or coalesce(v_rewarded, false) then
    return;
  end if;
  if not v_onboard then
    return;
  end if;

  -- „măcar o acțiune": conținut, salvare sau urmărire
  select exists (select 1 from public.experiences where author_id = p_user_id and status = 'active')
      or exists (select 1 from public.saves where user_id = p_user_id)
      or exists (select 1 from public.follows where follower_id = p_user_id)
    into v_activ;

  if not v_activ then
    return;
  end if;

  -- maximum 10 invitații plătite pe viață
  select count(*) into v_platite
  from public.points_ledger
  where actor_id = v_inviter and action_type = 'referral_completed';

  if v_platite < 10 then
    perform public.award_points(v_inviter, null, 'referral_completed', 'user', p_user_id, 15);
  end if;

  -- bonusul invitatului se dă chiar dacă invitatorul a depășit plafonul
  perform public.award_points(p_user_id, null, 'referral_welcome', 'user', v_inviter, 5);

  update public.profiles set referral_rewarded = true where id = p_user_id;
exception
  when others then
    raise notice 'maybe_reward_referral(%): %', p_user_id, sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 5. Momentele în care condiția se poate îndeplini
-- ---------------------------------------------------------------------
create or replace function public.referral_check_after_experience()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.maybe_reward_referral(new.author_id);
  return null;
end $$;

drop trigger if exists referral_experience_trg on public.experiences;
create trigger referral_experience_trg
  after insert on public.experiences
  for each row execute function public.referral_check_after_experience();

create or replace function public.referral_check_after_save()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.maybe_reward_referral(new.user_id);
  return null;
end $$;

drop trigger if exists referral_save_trg on public.saves;
create trigger referral_save_trg
  after insert on public.saves
  for each row execute function public.referral_check_after_save();

create or replace function public.referral_check_after_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.maybe_reward_referral(new.follower_id);
  return null;
end $$;

drop trigger if exists referral_follow_trg on public.follows;
create trigger referral_follow_trg
  after insert on public.follows
  for each row execute function public.referral_check_after_follow();

-- terminarea onboarding-ului e celălalt capăt al condiției
create or replace function public.referral_check_after_onboarding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.maybe_reward_referral(new.id);
  return null;
end $$;

drop trigger if exists referral_onboarding_trg on public.profiles;
create trigger referral_onboarding_trg
  after update of onboarding_completed on public.profiles
  for each row
  when (coalesce(new.onboarding_completed, false) and new.onboarding_completed is distinct from old.onboarding_completed)
  execute function public.referral_check_after_onboarding();

-- ---------------------------------------------------------------------
-- 6. Conturile invitate deja active, plătite retroactiv
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.profiles where referred_by is not null and not referral_rewarded loop
    perform public.maybe_reward_referral(r.id);
  end loop;
end $$;
