import type { SupabaseClient } from '@supabase/supabase-js'

export type Trip = {
  id: string
  author_id: string
  title: string
  description: string | null
  duration_days: number | null
  transport_type: string | null
  person_count: number | null
  countries: string[] | null
  cover_image: string | null
  save_count: number | null
  featured?: boolean | null
  /** ghid editorial, scris de echipă — vezi 20260807_trip_guides.sql */
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

export type ItineraryItem = {
  id: string
  day: number
  note: string | null
  position: number
  location: ItineraryLocation | null
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
  const { data, error } = await supabase
    .from('trip_locations')
    .select('id, location_id, day:day_number, note, position')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('position', { ascending: true })

  if (error || !data || data.length === 0) return []

  const rows = data as { id: string; location_id: string; day: number | null; note: string | null; position: number | null }[]
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country, category, cover_image')
    .in('id', rows.map(r => r.location_id))

  const byId: Record<string, ItineraryLocation> = {}
  for (const loc of (locations || []) as ItineraryLocation[]) byId[loc.id] = loc

  return rows.map(r => ({
    id: r.id,
    day: r.day ?? 1,
    note: r.note,
    position: r.position ?? 0,
    location: byId[r.location_id] || null,
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
