-- =====================================================================
-- Pocoloco — Economia de puncte (6/6): istoricul existent
--
-- Fără asta, toți userii pornesc de la zero și cei care au construit
-- conținutul de până acum ar fi pedepsiți. Migrarea reconstruiește
-- registrul din ce există deja în bază, cu datele originale.
--
-- Se poate rula de mai multe ori: fiecare insert are `on conflict do
-- nothing`, iar cheia unică din registru face restul.
--
-- Nu recreează: share-urile (nu existau), invitațiile (idem), replicile
-- autorului la comentarii (le tratăm pe toate ca simple comentarii) și
-- mutările „vreau să merg" → „am fost" (nu avem istoricul tranzițiilor).
--
-- Rulează ULTIMA, după migrările 1–5 din serie.
-- =====================================================================

-- Triggerul de totaluri ar recalcula profilul la fiecare rând. Îl oprim
-- cât durează backfill-ul și recalculăm o singură dată, la final.
alter table public.points_ledger disable trigger points_sync_total_trg;

-- ---------------------------------------------------------------------
-- 1. Locații adăugate — 8
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select l.added_by, 'location_added', 'location', l.id, 8, l.created_at
from public.locations l
where l.added_by is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Experiențe publicate — 10 + bonusurile de completitudine
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, meta, created_at)
select
  e.author_id,
  'experience_posted',
  'experience',
  e.id,
  10
    + case when e.location_id is not null then 3 else 0 end
    + case when jsonb_array_length(coalesce(to_jsonb(e.images), '[]'::jsonb)) > 0 then 4 else 0 end
    + case when coalesce(btrim(e.content), '') <> '' then 3 else 0 end
    + case when jsonb_array_length(coalesce(to_jsonb(e.tips), '[]'::jsonb)) > 0 then 5 else 0 end
    + case when coalesce(e.rating_experience, 0) > 0 then 2 else 0 end,
  jsonb_build_object('backfill', true),
  e.created_at
from public.experiences e
where e.author_id is not null and e.status = 'active'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. Călătorii publicate — 20 + copertă + rezumat + public
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, meta, created_at)
select
  t.author_id,
  'trip_posted',
  'trip',
  t.id,
  20
    + case when coalesce(t.cover_image, '') <> '' then 3 else 0 end
    + case when coalesce(btrim(t.description), '') <> '' then 3 else 0 end
    + 8,
  jsonb_build_object('backfill', true),
  t.created_at
from public.trips t
where t.author_id is not null and t.status = 'active'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. Voturi pozitive — actor 1, autor 2 (experiențe) sau 1 (comentarii)
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select v.user_id, 'experience_upvoted', 'experience', v.experience_id, 1, v.created_at
from public.votes v
where v.type = 'up' and v.experience_id is not null
on conflict do nothing;

insert into public.points_ledger (actor_id, recipient_id, action_type, content_type, content_id, points, created_at)
select v.user_id, e.author_id, 'experience_upvoted', 'experience', v.experience_id, 2, v.created_at
from public.votes v
join public.experiences e on e.id = v.experience_id
where v.type = 'up' and e.author_id is not null and e.author_id <> v.user_id
on conflict do nothing;

insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select v.user_id, 'comment_upvoted', 'comment', v.comment_id, 1, v.created_at
from public.votes v
where v.type = 'up' and v.comment_id is not null
on conflict do nothing;

insert into public.points_ledger (actor_id, recipient_id, action_type, content_type, content_id, points, created_at)
select v.user_id, c.author_id, 'comment_upvoted', 'comment', v.comment_id, 1, v.created_at
from public.votes v
join public.comments c on c.id = v.comment_id
where v.type = 'up' and c.author_id is not null and c.author_id <> v.user_id
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5. Comentarii — 3/3, doar primele 3 pe experiență per user
-- ---------------------------------------------------------------------
with numerotate as (
  select
    c.id, c.author_id, c.experience_id, c.created_at,
    row_number() over (partition by c.author_id, c.experience_id order by c.created_at) as rang
  from public.comments c
  where c.author_id is not null
)
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, meta, created_at)
select n.author_id, 'comment_added', 'comment', n.id, 3,
       jsonb_build_object('experience_id', n.experience_id, 'backfill', true), n.created_at
from numerotate n
where n.rang <= 3
on conflict do nothing;

with numerotate as (
  select
    c.id, c.author_id, c.experience_id, c.created_at,
    row_number() over (partition by c.author_id, c.experience_id order by c.created_at) as rang
  from public.comments c
  where c.author_id is not null
)
insert into public.points_ledger (actor_id, recipient_id, action_type, content_type, content_id, points, meta, created_at)
select n.author_id, e.author_id, 'comment_added', 'comment', n.id, 3,
       jsonb_build_object('experience_id', n.experience_id, 'backfill', true), n.created_at
from numerotate n
join public.experiences e on e.id = n.experience_id
where n.rang <= 3 and e.author_id is not null and e.author_id <> n.author_id
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 6. Salvări — jurnal de locații și călătorii salvate
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select s.user_id,
       case when s.status = 'visited' then 'location_visited' else 'location_wishlist' end,
       'location', s.location_id,
       case when s.status = 'visited' then 2 else 1 end,
       s.created_at
from public.saves s
where s.location_id is not null
on conflict do nothing;

insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select s.user_id, 'trip_saved', 'trip', s.trip_id, 1, s.created_at
from public.saves s
where s.trip_id is not null
on conflict do nothing;

insert into public.points_ledger (actor_id, recipient_id, action_type, content_type, content_id, points, created_at)
select s.user_id, t.author_id, 'trip_saved', 'trip', s.trip_id, 10, s.created_at
from public.saves s
join public.trips t on t.id = s.trip_id
where t.author_id is not null and t.author_id <> s.user_id
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 7. Urmăriri — 2/5
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, content_type, content_id, points, created_at)
select f.follower_id, 'user_followed', 'user', f.following_id, 2, f.created_at
from public.follows f
on conflict do nothing;

insert into public.points_ledger (actor_id, recipient_id, action_type, content_type, content_id, points, created_at)
select f.follower_id, f.following_id, 'user_followed', 'user', f.following_id, 5, f.created_at
from public.follows f
where f.following_id <> f.follower_id
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 8. Profiluri deja completate — 20
-- ---------------------------------------------------------------------
insert into public.points_ledger (actor_id, action_type, points, created_at)
select p.id, 'profile_completed', 20, p.created_at
from public.profiles p
where p.bio is not null and btrim(p.bio) <> '' and p.avatar_url is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 9. Totalurile, calculate o singură dată
-- ---------------------------------------------------------------------
alter table public.points_ledger enable trigger points_sync_total_trg;

update public.profiles p
   set points_total = coalesce(l.total, 0),
       points_level = public.level_for_points(coalesce(l.total, 0))
from (
  select coalesce(recipient_id, actor_id) as user_id, sum(points) as total
  from public.points_ledger
  group by 1
) l
where l.user_id = p.id;

-- conturile fără nicio linie în registru rămân la zero
update public.profiles
   set points_total = 0, points_level = 1
 where not exists (
   select 1 from public.points_ledger where coalesce(recipient_id, actor_id) = profiles.id
 ) and (points_total <> 0 or points_level <> 1);

-- ---------------------------------------------------------------------
-- 10. Câți au primit puncte, ca să vezi imediat dacă a mers
-- ---------------------------------------------------------------------
do $$
declare
  v_randuri integer;
  v_useri   integer;
begin
  select count(*), count(distinct coalesce(recipient_id, actor_id))
    into v_randuri, v_useri
  from public.points_ledger;

  raise notice 'Registru: % rânduri pentru % useri.', v_randuri, v_useri;
end $$;
