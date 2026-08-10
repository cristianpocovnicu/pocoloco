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

/** Nivelurile administrative, fiecare în câmpul lui. */
export type PlaceGeography = {
  /** localitatea propriu-zisă, fără fallback */
  locality: string | null
  /** regiunea: Madeira, Brașov, Andaluzia */
  adminArea1: string | null
  adminArea2: string | null
  country: string | null
  countryCode: string | null
  /** text de afișare, cu același lanț de fallback ca înainte */
  city: string
}

export type PlaceDetails = PlaceGeography & {
  name: string
  latitude: number | null
  longitude: number | null
  placeId: string
  /** tipurile Google ale locului — vezi isBroadRegion */
  types: string[]
}

/**
 * Tipurile care descriu o zonă întreagă, nu un loc anume.
 *
 * Orașele lipsesc intenționat: o recenzie la un oraș e legitimă și
 * folositoare.
 *
 * `natural_feature` a fost aici până la iterația 8. Google îl pune și pe
 * insule, și pe vârfuri de munte — iar un vârf, o cascadă sau o plajă e
 * exact genul de loc despre care se scrie o recenzie. Cât timp detecția
 * doar întreba, un fals pozitiv costa un tap. De când rutează singură
 * (iterația 7), costă tot fluxul: Pico do Arieiro ajungea pe ramura
 * călătorie, ca și cum ar fi fost o regiune.
 *
 * Ce pierdem, asumat: o insulă care la Google e **doar**
 * `natural_feature`, fără niciun nivel administrativ, pleacă acum pe
 * ramura de recenzie. Insulele mari sunt și regiuni administrative, deci
 * rămân acoperite; pentru restul există comutarea de pe ecranul journey.
 */
const BROAD_TYPES = [
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
]

export function isBroadRegion(types: string[] | null | undefined): boolean {
  if (!types || types.length === 0) return false
  // orașul câștigă: „Funchal" e locality, chiar dacă vine și cu alte tipuri
  if (types.includes('locality') || types.includes('sublocality')) return false
  return types.some(type => BROAD_TYPES.includes(type))
}

type AddressComponent = { longText?: string; shortText?: string; types?: string[] }

/**
 * Componentele de adresă, desfăcute pe niveluri.
 *
 * Fără lanțul de fallback de dinainte: acolo `city` ajungea să însemne ba
 * oraș, ba județ, ba regiune, în funcție de ce avea Google pentru locul
 * respectiv. Îl păstrăm doar ca text de afișare; de aici înainte fiecare
 * nivel are coloana lui.
 */
export function extractGeography(components: AddressComponent[] | undefined): PlaceGeography {
  const list = components || []
  const long = (type: string) => list.find(c => c.types?.includes(type))?.longText || null
  const short = (type: string) => list.find(c => c.types?.includes(type))?.shortText || null

  const locality = long('locality')
  const adminArea1 = long('administrative_area_level_1')
  const adminArea2 = long('administrative_area_level_2')

  return {
    locality,
    adminArea1,
    adminArea2,
    country: long('country'),
    countryCode: short('country'),
    city: locality || adminArea2 || adminArea1 || '',
  }
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

export type GeocodeResult = PlaceGeography & {
  latitude: number
  longitude: number
  /** ce a găsit Google — util ca adminul să verifice că e locul potrivit */
  matchedName: string
  formattedAddress: string
  placeId: string | null
}

/**
 * Doar geografia unui loc, pentru completarea retroactivă din admin.
 * Field mask minim: plătim exact ce folosim.
 */
export async function fetchPlaceGeography(placeId: string): Promise<PlaceGeography | null> {
  if (!API_KEY || !placeId) return null

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ro`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'addressComponents',
        },
      }
    )

    if (!res.ok) return null
    const data = await res.json()
    const geo = extractGeography(data.addressComponents as AddressComponent[] | undefined)

    // fără niciun nivel completat n-avem ce salva
    if (!geo.locality && !geo.adminArea1 && !geo.adminArea2 && !geo.country) return null
    return geo
  } catch {
    return null
  }
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
        // addressComponents ridică cererea la SKU-ul Places Advanced.
        // Decizie asumată: la volumul nostru costul e neglijabil, iar fără
        // el geocodarea din admin n-ar completa geografia deloc.
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.addressComponents',
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
      ...extractGeography(place.addressComponents as AddressComponent[] | undefined),
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

export type ReverseArea = {
  /** numele zonei, cât mai aproape de cum i-ar zice un om: „Funchal" */
  name: string
  /** contextul, pentru afișare: „Madeira, Portugalia" */
  context: string
}

/** Geocoding API întoarce componentele în alt format decât Places (New). */
type LegacyComponent = { long_name?: string; short_name?: string; types?: string[] }

/**
 * Invers față de restul fișierului: din coordonate, un nume de zonă.
 *
 * Atenție, e alt API decât tot ce e mai sus. Places API (New) știe să
 * caute după text, nu după punct; pentru drumul invers Google are
 * **Geocoding API**, care se activează separat în consolă, chiar dacă
 * folosește aceeași cheie. Fără activare, răspunsul vine cu
 * `REQUEST_DENIED`, funcția întoarce null, iar cine o cheamă continuă
 * fără nume — vezi docs/google-places-setup.md.
 *
 * `result_type` taie adresele stradale: dintr-un punct în mijlocul unui
 * oraș vrem „Funchal", nu „Rua da Alfândega 12".
 */
export async function reverseGeocodeArea(
  latitude: number,
  longitude: number
): Promise<ReverseArea | null> {
  if (!API_KEY) return null

  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    language: 'ro',
    result_type: 'locality|administrative_area_level_2|administrative_area_level_1|country',
    key: API_KEY,
  })

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
    if (!res.ok) return null

    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return null

    // toate componentele din toate rezultatele, de la cel mai precis în jos
    const components: AddressComponent[] = (data.results as { address_components?: LegacyComponent[] }[])
      .flatMap(result => result.address_components || [])
      .map(component => ({
        longText: component.long_name,
        shortText: component.short_name,
        types: component.types,
      }))

    const geo = extractGeography(components)
    const name = geo.locality || geo.adminArea2 || geo.adminArea1 || geo.country
    if (!name) return null

    const context = [
      geo.locality ? geo.adminArea1 : null,
      geo.country && geo.country !== name ? geo.country : null,
    ].filter(Boolean).join(', ')

    return { name, context }
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
          // types vine în aceeași cerere: tariful e dat oricum de
          // addressComponents, deci nu costă nimic în plus
          'X-Goog-FieldMask': 'displayName,location,addressComponents,types',
        },
      }
    )

    if (!res.ok) return null
    const data = await res.json()

    const geo = extractGeography(data.addressComponents as AddressComponent[] | undefined)

    return {
      ...geo,
      country: geo.country || 'România',
      name: data.displayName?.text || '',
      latitude: data.location?.latitude ?? null,
      longitude: data.location?.longitude ?? null,
      placeId,
      types: (data.types || []) as string[],
    }
  } catch {
    return null
  }
}
