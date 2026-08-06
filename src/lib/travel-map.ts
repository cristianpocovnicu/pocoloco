import type { SupabaseClient } from '@supabase/supabase-js'
import type { SaveStatus } from '@/lib/saves'
import { CATEGORY_ICONS } from '@/lib/utils'

/** Un loc de pe harta călătorului: doar ce are nevoie pinul și popup-ul. */
export type TravelPoint = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  latitude: number
  longitude: number
  score: number | null
  status: SaveStatus
}

type LocationRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  latitude: number | null
  longitude: number | null
  score: number | null
  status: string | null
}

const LOCATION_COLUMNS = 'id, name, city, country, category, latitude, longitude, score, status'

function toPoints(
  rows: { status: SaveStatus; location: LocationRow | null }[]
): TravelPoint[] {
  return rows
    .filter(r => r.location && r.location.latitude != null && r.location.longitude != null)
    .filter(r => r.location!.status !== 'rejected')
    .map(r => ({
      id: r.location!.id,
      name: r.location!.name,
      city: r.location!.city,
      country: r.location!.country,
      category: r.location!.category,
      latitude: r.location!.latitude as number,
      longitude: r.location!.longitude as number,
      score: r.location!.score,
      status: r.status,
    }))
}

/**
 * Toate punctele hărții dintr-o singură cerere: `saves` cu locația
 * atașată, filtrat pe user și pe listele cerute.
 *
 * Pe profilul public cerem doar 'visited' — lista „Vreau să merg" e
 * privată și oricum blocată de RLS.
 */
export async function fetchTravelPoints(
  supabase: SupabaseClient,
  userId: string,
  statuses: SaveStatus[] = ['visited']
): Promise<TravelPoint[]> {
  const { data, error } = await supabase
    .from('saves')
    .select(`status, location:locations!location_id(${LOCATION_COLUMNS})`)
    .eq('user_id', userId)
    .in('status', statuses)
    .not('location_id', 'is', null)
    .limit(500)

  if (!error && data) {
    return toPoints(data as unknown as { status: SaveStatus; location: LocationRow | null }[])
  }

  // Fără cheia străină saves.location_id → locations, PostgREST refuză
  // atașarea. Atunci luăm locațiile separat, ca în lib/saves.ts.
  const { data: saves } = await supabase
    .from('saves')
    .select('status, location_id')
    .eq('user_id', userId)
    .in('status', statuses)
    .not('location_id', 'is', null)
    .limit(500)

  const rows = (saves || []) as { status: SaveStatus; location_id: string }[]
  if (rows.length === 0) return []

  const { data: locations } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .in('id', rows.map(r => r.location_id))
    .not('latitude', 'is', null)

  const byId: Record<string, LocationRow> = {}
  for (const loc of (locations || []) as LocationRow[]) byId[loc.id] = loc

  return toPoints(rows.map(r => ({ status: r.status, location: byId[r.location_id] || null })))
}

export type TravelStats = {
  visited: number
  countries: number
  /** categoria în care a fost cel mai des, cu emoji — null sub 3 vizite */
  topCategory: { label: string; icon: string } | null
}

/**
 * TODO (județe): „X județe din 40" cere o coloană `county` pe `locations`,
 * care nu există în schemă. Ar trebui populată la geocodare, din
 * `administrative_area_level_1` al răspunsului Google. Până atunci,
 * statisticile se opresc la țări.
 */
export function computeTravelStats(points: TravelPoint[]): TravelStats {
  const visitedPoints = points.filter(p => p.status === 'visited')

  const countries = new Set(
    visitedPoints
      .map(p => (p.country || '').trim().toLowerCase())
      .filter(Boolean)
  )

  let topCategory: TravelStats['topCategory'] = null
  // sub 3 vizite, „categoria dominantă" e doar zgomot
  if (visitedPoints.length >= 3) {
    const counts: Record<string, number> = {}
    for (const point of visitedPoints) {
      const category = (point.category || '').trim()
      if (category) counts[category] = (counts[category] || 0) + 1
    }

    const [label] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || []
    if (label) topCategory = { label, icon: CATEGORY_ICONS[label] || '📍' }
  }

  return {
    visited: visitedPoints.length,
    countries: countries.size,
    topCategory,
  }
}
