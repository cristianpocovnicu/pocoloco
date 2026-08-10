import type { SupabaseClient } from '@supabase/supabase-js'

export type Trip = {
  id: string
  author_id: string
  title: string
  description: string | null
  duration_days: number | null
  /** coloana veche, un singur mijloc — oglinda primului element */
  transport_type: string | null
  /** mijloacele călătoriei, de la migrarea 39 */
  transport_types?: string[] | null
  /**
   * Rămas din schema inițială. Niciun ecran nu-l scrie și, de la curățenia
   * din 9 august 2026, niciunul nu-l citește — coloana stă pe loc, tipul o
   * ține minte. Se șterge când decidem că nu mai vrem câmpul deloc.
   */
  person_count: number | null
  countries: string[] | null
  cover_image: string | null
  save_count: number | null
  featured?: boolean | null
  /** ghid editorial, scris de echipă — vezi 019_20260807_trip_guides.sql */
  is_guide?: boolean | null
  status: string
  created_at: string
}

export type ItineraryLocation = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  cover_image: string | null
}

/** O oprire poate fi o activitate povestită de autor, fără pin pe hartă. */
export type ItineraryActivity = {
  id: string
  title: string | null
  activity_category: string | null
  activity_area: string | null
  images: string[] | null
}

export type ItineraryItem = {
  id: string
  day: number
  note: string | null
  position: number
  location: ItineraryLocation | null
  experience: ItineraryActivity | null
}

/**
 * Itinerarul unei călătorii, ordonat pe zile.
 * Locațiile sunt aduse separat, ca să nu depindem de numele relației
 * (FK) dintre trip_locations și locations.
 */
export async function fetchItinerary(
  supabase: SupabaseClient,
  tripId: string
): Promise<ItineraryItem[]> {
  // coloana din bază e day_number; o aliasăm ca `day` pentru restul codului
  // experience_id vine din 028_20260808_trip_activity_stops; dacă migrarea nu
  // e rulată, selectul cade și rămânem pe forma veche, doar cu locații
const stops = (columns: string) => supabase
    .from('trip_locations')
    .select(columns)
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('position', { ascending: true })

  let { data, error } = await stops('id, location_id, experience_id, day:day_number, note, position')
  if (error) {
    ({ data, error } = await stops('id, location_id, day:day_number, note, position'))
  }

  if (error || !data || data.length === 0) return []

  const rows = data as unknown as {
    id: string
    location_id: string | null
    experience_id?: string | null
    day: number | null
    note: string | null
    position: number | null
  }[]

  const locationIds = rows.map(r => r.location_id).filter(Boolean) as string[]
  const experienceIds = rows.map(r => r.experience_id).filter(Boolean) as string[]

  const [locationRes, experienceRes] = await Promise.all([
    locationIds.length > 0
      ? supabase.from('locations').select('id, name, city, country, category, cover_image').in('id', locationIds)
      : Promise.resolve({ data: [] }),
    experienceIds.length > 0
      ? supabase.from('experiences').select('id, title, activity_category, activity_area, images').in('id', experienceIds)
      : Promise.resolve({ data: [] }),
  ])

  const byId: Record<string, ItineraryLocation> = {}
  for (const loc of ((locationRes.data || []) as unknown as ItineraryLocation[])) byId[loc.id] = loc

  const activityById: Record<string, ItineraryActivity> = {}
  for (const exp of ((experienceRes.data || []) as unknown as ItineraryActivity[])) activityById[exp.id] = exp

  return rows.map(r => ({
    id: r.id,
    day: r.day ?? 1,
    note: r.note,
    position: r.position ?? 0,
    location: r.location_id ? byId[r.location_id] || null : null,
    experience: r.experience_id ? activityById[r.experience_id] || null : null,
  }))
}

/** Grupează itinerarul pe zile, în ordine. */
export function groupByDay(items: ItineraryItem[]): { day: number; items: ItineraryItem[] }[] {
  const days: Record<number, ItineraryItem[]> = {}
  for (const item of items) (days[item.day] ||= []).push(item)

  return Object.keys(days)
    .map(Number)
    .sort((a, b) => a - b)
    .map(day => ({ day, items: days[day].sort((a, b) => a.position - b.position) }))
}

export async function isTripSaved(
  supabase: SupabaseClient,
  userId: string,
  tripId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('saves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('trip_id', tripId)
    if (error) return false
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

/** Salvează / scoate din salvate. Contorul e ținut de trigger în DB. */
export async function setTripSaved(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
  saved: boolean
): Promise<string | null> {
  if (saved) {
    const { error } = await supabase.from('saves').insert({ user_id: userId, trip_id: tripId })
    return error?.message ?? null
  }
  const { error } = await supabase
    .from('saves')
    .delete()
    .eq('user_id', userId)
    .eq('trip_id', tripId)
  return error?.message ?? null
}

/**
 * Recalculează copertele automate după ce dispar poze dintr-o experiență.
 *
 * `apply_trip_auto_cover` (migrarea 33) se oprește dacă ieșirea are deja o
 * copertă — și pe bună dreptate: n-are voie să calce peste una aleasă de
 * om. Dar când coperta *automată* arată exact spre o poză tocmai scoasă,
 * rămâne un URL mort. Atunci o golim întâi și lăsăm funcția să aleagă din
 * nou; `cover_source = 'user'` nu se atinge niciodată, chiar dacă poza
 * dispare din experiență — fișierul rămâne în storage, iar alegerea a fost
 * a autorului.
 */
export async function refreshAutoCovers(
  supabase: SupabaseClient,
  { experienceId, locationId, removed }: {
    experienceId: string
    locationId: string | null
    removed: string[]
  }
): Promise<void> {
  if (removed.length === 0) return

  try {
    // opririle care trimit spre experiența asta: fie direct (activitate),
    // fie prin locul ei
    const filter = locationId
      ? `experience_id.eq.${experienceId},location_id.eq.${locationId}`
      : `experience_id.eq.${experienceId}`

    const { data: stops } = await supabase
      .from('trip_locations')
      .select('trip_id')
      .or(filter)

    const tripIds = Array.from(new Set((stops || []).map((s: { trip_id: string }) => s.trip_id)))
    if (tripIds.length === 0) return

    const { data: trips } = await supabase
      .from('trips')
      .select('id, cover_image, cover_source')
      .in('id', tripIds)

    for (const trip of (trips || []) as { id: string; cover_image: string | null; cover_source: string | null }[]) {
      const orphan = trip.cover_source === 'auto'
        && !!trip.cover_image
        && removed.includes(trip.cover_image)

      if (!orphan) continue

      await supabase.from('trips').update({ cover_image: null }).eq('id', trip.id)
      await supabase.rpc('apply_trip_auto_cover', { p_trip_id: trip.id })
    }
  } catch {
    // coperta e cosmetică: n-are voie să strice salvarea experienței
  }
}
