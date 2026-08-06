import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchPlacePhoto } from '@/lib/places'

/**
 * Aduce prima poză a locului din Google și o pune drept copertă.
 *
 * Nu aruncă niciodată: fiecare pas poate eșua (fără cheie, loc fără poze,
 * bucket refuzat, RLS), iar în orice caz locația rămâne pur și simplu fără
 * poză. De asta e apelată fără `await` din fluxurile de creare.
 *
 * Întoarce URL-ul public al copertei, sau null dacă n-a ieșit nimic.
 */
export async function attachGoogleCover(
  supabase: SupabaseClient,
  locationId: string,
  placeId: string
): Promise<string | null> {
  try {
    const blob = await fetchPlacePhoto(placeId)
    if (!blob) return null

    const path = `locations/${locationId}/cover.jpg`
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true })

    if (uploadError) return null

    const { data } = supabase.storage.from('images').getPublicUrl(path)
    const publicUrl = data.publicUrl
    if (!publicUrl) return null

    // nu suprascriem o copertă pusă de om
    const { error: updateError } = await supabase
      .from('locations')
      .update({ cover_image: publicUrl, cover_source: 'google', google_place_id: placeId })
      .eq('id', locationId)
      .is('cover_image', null)

    if (updateError) return null
    return publicUrl
  } catch {
    return null
  }
}
