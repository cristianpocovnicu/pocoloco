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
