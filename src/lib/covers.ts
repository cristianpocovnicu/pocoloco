import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Prima poză din experiențele fiecărei locații, pentru cardurile fără
 * cover_image. Un singur query pentru tot setul de carduri — altfel ar
 * însemna o cerere per card.
 */
export async function fetchLocationCovers(
  supabase: SupabaseClient,
  locationIds: string[]
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(locationIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('experiences')
    .select('location_id, images, created_at')
    .in('location_id', ids)
    .eq('status', 'active')
    .not('images', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error || !data) return {}

  const covers: Record<string, string> = {}
  for (const row of data as { location_id: string; images: string[] | null }[]) {
    if (covers[row.location_id]) continue
    const first = row.images?.find(url => !!url)
    if (first) covers[row.location_id] = first
  }
  return covers
}
