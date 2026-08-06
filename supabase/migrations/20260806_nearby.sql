-- =====================================================================
-- Pocoloco — Locații în apropiere
--
-- Haversine direct în SQL, fără PostGIS: pentru câteva mii de locații e
-- suficient, iar extensia ar fi un cost de întreținere degeaba.
-- =====================================================================

create or replace function public.nearby_locations(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_km  double precision default 10,
  p_exclude_id uuid default null,
  p_limit      integer default 6
)
returns table (
  id               uuid,
  name             text,
  city             text,
  country          text,
  category         text,
  cover_image      text,
  score            numeric,
  experience_count integer,
  latitude         double precision,
  longitude        double precision,
  distance_km      double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.city,
    l.country,
    l.category,
    l.cover_image,
    l.score,
    l.experience_count,
    l.latitude,
    l.longitude,
    -- 6371 = raza Pământului în km
    2 * 6371 * asin(
      sqrt(
          power(sin(radians(l.latitude - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(l.latitude))
        * power(sin(radians(l.longitude - p_lng) / 2), 2)
      )
    ) as distance_km
  from public.locations l
  where l.status = 'approved'
    and l.latitude is not null
    and l.longitude is not null
    and (p_exclude_id is null or l.id <> p_exclude_id)
    -- filtru grosier pe dreptunghi înainte de calculul trigonometric:
    -- un grad de latitudine ≈ 111 km, longitudinea se strânge spre poli
    and l.latitude between p_lat - (p_radius_km / 111.0) and p_lat + (p_radius_km / 111.0)
    and l.longitude between
          p_lng - (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.01)))
      and p_lng + (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.01)))
  order by distance_km asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.nearby_locations(double precision, double precision, double precision, uuid, integer)
  to anon, authenticated;

-- prefiltrarea de mai sus folosește indexul
create index if not exists locations_coords_idx
  on public.locations (latitude, longitude)
  where latitude is not null and longitude is not null;
