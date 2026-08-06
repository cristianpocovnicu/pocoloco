/**
 * Google Places API (New), apelat direct din browser.
 *
 * Fără cheie (NEXT_PUBLIC_GOOGLE_PLACES_API_KEY), toate funcțiile de aici
 * întorc gol, iar aplicația rămâne pe căutarea în baza proprie — vezi
 * docs/google-places-setup.md.
 */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

export const PLACES_ENABLED = !!API_KEY

export type PlaceSuggestion = {
  placeId: string
  /** numele locului: „Castelul Bran" */
  mainText: string
  /** contextul: „Bran, România" */
  secondaryText: string
}

export type PlaceDetails = {
  name: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  placeId: string
}

/** Token de sesiune: leagă tastările de alegerea finală, ca Google să le factureze împreună. */
export function newSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function searchPlaces(
  input: string,
  sessionToken: string
): Promise<PlaceSuggestion[]> {
  if (!API_KEY || input.trim().length < 3) return []

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input: input.trim(),
        sessionToken,
        languageCode: 'ro',
      }),
    })

    if (!res.ok) return []
    const data = await res.json()

    type Prediction = {
      placePrediction?: {
        placeId: string
        structuredFormat?: {
          mainText?: { text?: string }
          secondaryText?: { text?: string }
        }
        text?: { text?: string }
      }
    }

    return ((data.suggestions || []) as Prediction[])
      .filter(s => s.placePrediction?.placeId)
      .map(s => ({
        placeId: s.placePrediction!.placeId,
        mainText: s.placePrediction!.structuredFormat?.mainText?.text
          || s.placePrediction!.text?.text
          || '',
        secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text || '',
      }))
      .filter(s => s.mainText)
  } catch {
    // rețea căzută sau cheie respinsă — rămânem pe rezultatele din baza noastră
    return []
  }
}

export type GeocodeResult = {
  latitude: number
  longitude: number
  /** ce a găsit Google — util ca adminul să verifice că e locul potrivit */
  matchedName: string
  formattedAddress: string
  placeId: string | null
}

/**
 * Prima poză a unui loc, descărcată ca blob.
 *
 * Două cereri: una pentru numele resursei foto, alta pentru fișier.
 * Field mask-ul cere doar `photos`, ca răspunsul să nu fie facturat la
 * un nivel mai scump decât e nevoie.
 */
export async function fetchPlacePhoto(
  placeId: string,
  maxWidth = 800
): Promise<Blob | null> {
  if (!API_KEY || !placeId) return null

  try {
    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'photos',
        },
      }
    )

    if (!detailsRes.ok) return null
    const details = await detailsRes.json()

    // numele arată ca „places/ChIJ.../photos/AeJbb3..."
    const photoName = details.photos?.[0]?.name as string | undefined
    if (!photoName) return null

    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${encodeURIComponent(API_KEY)}`
    )

    if (!photoRes.ok) return null
    const blob = await photoRes.blob()

    // răspuns gol sau non-imagine: mai bine fără poză decât cu un fișier stricat
    if (!blob.type.startsWith('image/') || blob.size === 0) return null
    return blob
  } catch {
    return null
  }
}

/**
 * Caută un loc după text liber („Castelul Bran, Bran") și întoarce
 * coordonatele primului rezultat. Un singur apel, spre deosebire de
 * autocomplete + detalii, pentru că nu avem de ales dintr-o listă.
 */
export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  if (!API_KEY || !query.trim()) return null

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        languageCode: 'ro',
        maxResultCount: 1,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const place = data.places?.[0]

    if (!place?.location?.latitude || !place?.location?.longitude) return null

    return {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      matchedName: place.displayName?.text || '',
      formattedAddress: place.formattedAddress || '',
      placeId: place.id || null,
    }
  } catch {
    return null
  }
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<PlaceDetails | null> {
  if (!API_KEY) return null

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ro&sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'displayName,location,addressComponents',
        },
      }
    )

    if (!res.ok) return null
    const data = await res.json()

    type Component = { longText?: string; shortText?: string; types?: string[] }
    const components = (data.addressComponents || []) as Component[]
    const pick = (type: string) => components.find(c => c.types?.includes(type))?.longText || ''

    return {
      name: data.displayName?.text || '',
      // orașul: localitate, altfel județ/regiune
      city: pick('locality') || pick('administrative_area_level_2') || pick('administrative_area_level_1'),
      country: pick('country') || 'România',
      latitude: data.location?.latitude ?? null,
      longitude: data.location?.longitude ?? null,
      placeId,
    }
  } catch {
    return null
  }
}
