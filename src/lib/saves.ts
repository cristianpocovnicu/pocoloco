import type { SupabaseClient } from '@supabase/supabase-js'

/** Cele două liste din jurnalul de călătorie. */
export type SaveStatus = 'want_to_go' | 'visited'

export type SavedLocation = {
  status: SaveStatus
  saved_at: string
  location: {
    id: string
    name: string
    city: string | null
    country: string | null
    category: string | null
    cover_image: string | null
    score: number | null
    experience_count: number | null
  }
}

/** În ce listă e locația pentru userul dat, dacă e în vreuna. */
export async function getLocationSaveStatus(
  supabase: SupabaseClient,
  userId: string,
  locationId: string
): Promise<SaveStatus | null> {
  try {
    const { data, error } = await supabase
      .from('saves')
      .select('status')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .maybeSingle()

    if (error || !data) return null
    return (data as { status: SaveStatus }).status
  } catch {
    return null
  }
}

/**
 * Pune locația într-o listă, o mută între liste, sau o scoate (status null).
 * Indexul unic (user_id, location_id) garantează un singur rând, deci
 * cele două liste rămân exclusive fără verificări în plus.
 */
export async function setLocationSaveStatus(
  supabase: SupabaseClient,
  userId: string,
  locationId: string,
  status: SaveStatus | null
): Promise<string | null> {
  if (status === null) {
    const { error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('location_id', locationId)
    return error?.message ?? null
  }

  // update întâi: dacă rândul există deja, evităm conflictul pe indexul unic
  const { data: updated, error: updateError } = await supabase
    .from('saves')
    .update({ status })
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .select('id')

  if (updateError) return updateError.message
  if (updated && updated.length > 0) return null

  const { error: insertError } = await supabase
    .from('saves')
    .insert({ user_id: userId, location_id: locationId, status })
  return insertError?.message ?? null
}

export type SavedTrip = {
  saved_at: string
  trip: {
    id: string
    title: string
    cover_image: string | null
    duration_days: number | null
    countries: string[] | null
    save_count: number | null
  }
}

/** Călătoriile salvate de user, pentru tabul „Salvate" din profil. */
export async function fetchSavedTrips(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedTrip[]> {
  const { data, error } = await supabase
    .from('saves')
    .select('created_at, trip_id')
    .eq('user_id', userId)
    .not('trip_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data || data.length === 0) return []

  const rows = data as { created_at: string; trip_id: string }[]
  const { data: trips } = await supabase
    .from('trips')
    .select('id, title, cover_image, duration_days, countries, save_count')
    .in('id', rows.map(r => r.trip_id))
    .eq('status', 'active')

  const byId: Record<string, SavedTrip['trip']> = {}
  for (const trip of (trips || []) as SavedTrip['trip'][]) byId[trip.id] = trip

  return rows
    .filter(r => byId[r.trip_id])
    .map(r => ({ saved_at: r.created_at, trip: byId[r.trip_id] }))
}

/** Locațiile dintr-o listă, cu datele necesare pentru carduri. */
export async function fetchSavedLocations(
  supabase: SupabaseClient,
  userId: string,
  status: SaveStatus
): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saves')
    .select('status, created_at, location_id')
    .eq('user_id', userId)
    .eq('status', status)
    .not('location_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data || data.length === 0) return []

  const rows = data as { status: SaveStatus; created_at: string; location_id: string }[]
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country, category, cover_image, score, experience_count')
    .in('id', rows.map(r => r.location_id))
    .eq('status', 'approved')

  const byId: Record<string, SavedLocation['location']> = {}
  for (const loc of (locations || []) as SavedLocation['location'][]) byId[loc.id] = loc

  return rows
    .filter(r => byId[r.location_id])
    .map(r => ({ status: r.status, saved_at: r.created_at, location: byId[r.location_id] }))
}
