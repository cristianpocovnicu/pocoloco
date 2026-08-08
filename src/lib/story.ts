import type { SupabaseClient } from '@supabase/supabase-js'
import { attachGoogleCover } from '@/lib/location-cover'
import type { ExperienceKind } from '@/lib/activities'

/**
 * O oprire din ecranul de creare.
 *
 * Pozele sunt ținute ca URL-uri, nu ca fișiere: se urcă în Storage imediat
 * ce le alegi, altfel n-ar supraviețui într-un draft.
 */
export type StopDraft = {
  key: string
  kind: ExperienceKind
  /** loc */
  locationId: string | null
  locationName: string
  locationCity: string
  locationCountry: string
  lat: number | null
  lng: number | null
  placeId: string | null
  /** nivelurile administrative, așa cum le dă Google */
  locality: string | null
  adminArea1: string | null
  adminArea2: string | null
  countryCode: string | null
  /** activitate */
  activityTitle: string
  activityCategory: string | null
  activityArea: string
  /** când a fost acolo — ambele opționale, luna doar cu an */
  visitedYear: number | null
  visitedMonth: number | null
  /** conținut, tot opțional */
  images: string[]
  ratingExperience: number
  ratingAccess: number
  ratingCrowd: number
  content: string
  tips: string[]
  /** ziua din călătorie, aleasă la pasul de finalizare; null = neîmpărțit */
  day: number | null
}

export type TripDraft = {
  title: string
  /** povestea întregii ieșiri, nu a unui loc anume — trips.description */
  description: string
  durationDays: number
  /** mijloacele întregii ieșiri — până acolo și pe loc, nu per segment */
  transportTypes: string[]
  coverImage: string | null
  /** dedus din locurile alese, până pune omul mâna pe câmp */
  countries: string[]
  /**
   * Când a fost ieșirea. Pe ramura journey se întreabă o singură dată,
   * aici, și coboară la publicare pe fiecare experiență: schema rămâne
   * per-experiență, doar întrebarea s-a mutat.
   */
  visitedYear: number | null
  visitedMonth: number | null
}

/**
 * Ce a ales userul la prima căutare, nu ce fel de conținut a cerut.
 *
 *   'review'  — un obiectiv: un loc sau o activitate. Povestea e despre el.
 *   'journey' — o zonă întreagă: numele ei devine numele poveștii, iar
 *               locurile se adaugă pe rând dedesubt.
 *
 * Draftul vechi n-are câmpul: îl deducem din titlu (vezi loadDraft).
 */
export type StoryMode = 'review' | 'journey'

export type StoryDraft = {
  stops: StopDraft[]
  trip: TripDraft
  mode?: StoryMode
}

/** Un număr bun sau null — orice altceva dintr-un draft vechi e gunoi. */
function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

let counter = 0
export function newStop(partial: Partial<StopDraft> = {}): StopDraft {
  counter += 1
  // images și tips sunt nullable în DB, fără default: nimic din bază nu
  // oprește un null să ajungă acolo. Un draft vechi sau stricat n-are voie
  // să strecoare unul prin spread, deci le normalizăm aici.
  const safeArray = (value: unknown): string[] => (Array.isArray(value) ? value as string[] : [])

  const stop: StopDraft = {
    key: `stop-${Date.now()}-${counter}`,
    kind: 'place_visit',
    locationId: null,
    locationName: '',
    locationCity: '',
    locationCountry: 'România',
    lat: null,
    lng: null,
    placeId: null,
    locality: null,
    adminArea1: null,
    adminArea2: null,
    countryCode: null,
    activityTitle: '',
    activityCategory: null,
    activityArea: '',
    visitedYear: null,
    visitedMonth: null,
    images: [],
    ratingExperience: 0,
    ratingAccess: 0,
    ratingCrowd: 0,
    content: '',
    tips: [],
    day: null,
    ...partial,
  }

  return { ...stop, images: safeArray(stop.images), tips: safeArray(stop.tips) }
}

export function emptyTrip(): TripDraft {
  return {
    title: '',
    description: '',
    durationDays: 1,
    transportTypes: ['car'],
    coverImage: null,
    countries: [],
    visitedYear: null,
    visitedMonth: null,
  }
}

/** Are oprirea un subiect — un loc ales sau o activitate cu nume? */
export function stopHasSubject(stop: StopDraft): boolean {
  return stop.kind === 'activity'
    ? stop.activityTitle.trim().length > 0
    : stop.locationName.trim().length > 0
}

/** A scris ceva despre oprire? Doar atunci devine experiență. */
export function stopHasContent(stop: StopDraft): boolean {
  return stop.images.length > 0
    || stop.ratingExperience > 0
    || stop.ratingAccess > 0
    || stop.ratingCrowd > 0
    || stop.content.trim().length > 0
    || stop.tips.length > 0
}

export function stopLabel(stop: StopDraft): string {
  const label = stop.kind === 'activity' ? stop.activityTitle : stop.locationName
  return label.trim() || 'Fără nume'
}

export function stopSubtitle(stop: StopDraft): string {
  return stop.kind === 'activity'
    ? stop.activityArea.trim()
    : [stop.locationCity, stop.locationCountry].map(s => s.trim()).filter(Boolean).join(', ')
}

/**
 * Numele propus pentru o ieșire cu mai multe opriri: orașul comun, altfel
 * țara comună. E doar o sugestie — se poate rescrie.
 */
export function suggestTripTitle(stops: StopDraft[]): string {
  const cities = stops.map(s => s.locationCity.trim()).filter(Boolean)
  const countries = stops.map(s => s.locationCountry.trim()).filter(Boolean)
  const areas = stops.map(s => s.activityArea.trim()).filter(Boolean)

  const common = (values: string[]) => {
    if (values.length === 0) return ''
    const first = values[0].toLowerCase()
    return values.every(v => v.toLowerCase() === first) ? values[0] : ''
  }

  return common(cities) || common(areas) || common(countries) || ''
}

/**
 * Țările deduse din locurile alese.
 *
 * Doar din opriri care chiar au un loc: o activitate fără loc poartă
 * „România" ca valoare implicită a formularului, nu ca informație despre
 * unde a fost omul.
 */
export function suggestTripCountries(stops: StopDraft[]): string[] {
  const found = stops
    .filter(stop => stop.kind === 'place_visit' && stop.locationName.trim())
    .map(stop => stop.locationCountry.trim())
    .filter(Boolean)

  return Array.from(new Set(found))
}

// ---------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------

/**
 * Pozele urcate într-un draft abandonat rămân orfane în bucket. Nu le
 * ștergem de aici: ar însemna să urmărim fiecare poză scoasă din listă,
 * iar utilizatorul poate reveni pe draft. Curățenia e o problemă separată,
 * de rezolvat cu un job periodic peste storage.objects.
 */
export async function loadDraft(
  supabase: SupabaseClient,
  userId: string
): Promise<StoryDraft | null> {
  try {
    const { data, error } = await supabase
      .from('creation_drafts')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle()

    // tabelul vine din migrarea 29; fără el fluxul merge, doar că nu ține minte
    if (error || !data) return null

    const payload = (data as { payload: unknown }).payload as StoryDraft | null
    if (!payload || !Array.isArray(payload.stops) || payload.stops.length === 0) return null

    // un payload vechi sau stricat poate avea null unde codul așteaptă
    // string; normalizăm la intrare, nu la fiecare folosire
    const base = emptyTrip()
    // transportType: cheia dinaintea listei, poate exista în drafturi vechi
    const saved = (payload.trip || {}) as Partial<TripDraft> & { transportType?: unknown }

    return {
      stops: payload.stops.map(stop => newStop(stop)),
      trip: {
        ...base,
        ...saved,
        title: typeof saved.title === 'string' ? saved.title : base.title,
        description: typeof saved.description === 'string' ? saved.description : base.description,
        // draftul de dinaintea listei ținea un singur text
        transportTypes: Array.isArray(saved.transportTypes)
          ? saved.transportTypes.filter(t => typeof t === 'string')
          : typeof saved.transportType === 'string'
            ? [saved.transportType]
            : base.transportTypes,
        durationDays: Number.isFinite(saved.durationDays) ? (saved.durationDays as number) : base.durationDays,
        countries: Array.isArray(saved.countries) ? saved.countries.filter(c => typeof c === 'string') : base.countries,
        // draft de dinainte de urcarea perioadei: valoarea era pe primul
        // loc, deci o ridicăm de acolo
        visitedYear: numberOrNull(saved.visitedYear) ?? numberOrNull(payload.stops[0]?.visitedYear),
        visitedMonth: numberOrNull(saved.visitedMonth) ?? numberOrNull(payload.stops[0]?.visitedMonth),
      },
      // draft de dinaintea rutării: un titlu completat înseamnă că omul
      // pornise de la o zonă, altfel scria despre un obiectiv
      mode: payload.mode === 'journey' || payload.mode === 'review'
        ? payload.mode
        : ((saved.title || '').trim() ? 'journey' : 'review'),
    }
  } catch {
    return null
  }
}

export async function saveDraft(
  supabase: SupabaseClient,
  userId: string,
  draft: StoryDraft
): Promise<void> {
  try {
    await supabase
      .from('creation_drafts')
      .upsert(
        { user_id: userId, payload: draft as unknown as Record<string, unknown> },
        { onConflict: 'user_id' }
      )
  } catch {
    // salvarea automată nu are voie să deranjeze pe nimeni
  }
}

export async function deleteDraft(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    await supabase.from('creation_drafts').delete().eq('user_id', userId)
  } catch {
    // idem
  }
}

// ---------------------------------------------------------------------
// Publicare
// ---------------------------------------------------------------------

export type PublishResult = {
  tripId: string | null
  experienceId: string | null
  /** unde ducem userul după publicare */
  href: string
}

/** Locul scris de mână sau ales din Google devine locație, în moderare. */
async function resolveLocation(
  supabase: SupabaseClient,
  userId: string,
  stop: StopDraft
): Promise<string | null> {
  if (stop.locationId) return stop.locationId
  if (!stop.locationName.trim()) return null

  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .ilike('name', stop.locationName.trim())
    .limit(1)
    .maybeSingle()

  if (existing) return (existing as { id: string }).id

  const { data: created, error } = await supabase
    .from('locations')
    .insert({
      name: stop.locationName.trim(),
      city: stop.locationCity.trim(),
      country: stop.locationCountry.trim() || 'România',
      latitude: stop.lat,
      longitude: stop.lng,
      google_place_id: stop.placeId,
      locality: stop.locality,
      admin_area_1: stop.adminArea1,
      admin_area_2: stop.adminArea2,
      country_code: stop.countryCode,
      status: 'pending',
      added_by: userId,
    })
    .select('id')
    .single()

  if (error || !created) throw new Error(`Nu am putut salva locul „${stop.locationName.trim()}".`)

  const id = (created as { id: string }).id
  // coperta din Google, în fundal — nu ține publicarea în loc
  if (stop.placeId) void attachGoogleCover(supabase, id, stop.placeId)
  return id
}

/**
 * Publică tot ce e pe ecran.
 *
 * Pentru mai multe opriri trece prin `publish_story()`: corpul funcției e
 * o tranzacție, deci ori intră tot, ori nimic. Pentru o singură oprire
 * insertul direct e deja atomic, așa că merge și fără migrarea 30.
 */
export async function publishStory(
  supabase: SupabaseClient,
  userId: string,
  draft: StoryDraft
): Promise<PublishResult> {
  const stops = draft.stops.filter(stopHasSubject)
  if (stops.length === 0) throw new Error('Nu ai spus încă unde ai fost.')

  // locațiile se rezolvă întâi: funcția de publicare primește doar id-uri
  const locationIds: (string | null)[] = []
  for (const stop of stops) {
    locationIds.push(stop.kind === 'activity' ? null : await resolveLocation(supabase, userId, stop))
  }

  const period = { year: draft.trip.visitedYear, month: draft.trip.visitedMonth }

  const payload = stops.map((stop, i) => ({
    kind: stop.kind,
    location_id: locationIds[i],
    title: stop.kind === 'activity' ? stop.activityTitle.trim() : null,
    activity_category: stop.kind === 'activity' ? stop.activityCategory : null,
    activity_area: stop.kind === 'activity' ? (stop.activityArea.trim() || null) : null,
    content: stop.content.trim(),
    images: stop.images,
    tips: stop.tips,
    // 0 e sentinela de „nenotat" din ecran; în bază merge NULL, pentru
    // că experiences_rating_*_check acceptă doar 1–5
    rating_experience: stop.ratingExperience || null,
    rating_access: stop.ratingAccess || null,
    rating_crowd: stop.ratingCrowd || null,
    // perioada ieșirii, când a fost întrebată o singură dată sus; altfel
    // cea a locului
    visited_year: period.year ?? stop.visitedYear,
    visited_month: (period.year ?? stop.visitedYear) ? (period.year ? period.month : stop.visitedMonth) : null,
    day: stop.day,
    create_experience: stopHasContent(stop),
  }))

  // O poveste pornită de la o zonă are titlu propriu: chiar cu un singur
  // loc e o călătorie, nu o experiență răzleață.
  const isJourney = draft.mode === 'journey' && draft.trip.title.trim().length > 0


  // O singură oprire: un insert, fără călătorie inventată în jurul ei
  if (stops.length === 1 && !isJourney) {
    const single = payload[0]
    if (!single.create_experience && single.kind === 'place_visit') {
      throw new Error('Adaugă măcar o poză, o notă sau câteva cuvinte.')
    }

    const { data, error } = await supabase
      .from('experiences')
      .insert({
        kind: single.kind,
        location_id: single.location_id,
        title: single.title,
        activity_category: single.activity_category,
        activity_area: single.activity_area,
        author_id: userId,
        content: single.content,
        images: single.images,
        tips: single.tips,
        rating_experience: single.rating_experience,
        rating_access: single.rating_access,
        rating_crowd: single.rating_crowd,
        visited_year: single.visited_year,
        visited_month: single.visited_month,
        status: 'active',
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(error?.message || 'Nu am putut publica.')
    const id = (data as { id: string }).id
    return { tripId: null, experienceId: id, href: `/experience/${id}` }
  }

  const trip = {
    title: draft.trip.title.trim() || suggestTripTitle(stops) || 'Ieșirea mea',
    // publish_story o ia din payload; până acum nu i-o trimitea nimeni
    description: draft.trip.description.trim() || null,
    duration_days: Math.max(draft.trip.durationDays, 1),
    // lista e sursa; coloana veche primește primul element, ca oglindă
    transport_types: draft.trip.transportTypes,
    transport_type: draft.trip.transportTypes[0] || 'car',
    // Doar coperta atinsă de user pleacă spre DB. Cea „implicit prima
    // poză" e doar evidențiere în ecran: dacă n-a apăsat nimeni pe ea,
    // publish_story pune aceeași imagine, dar marcată 'auto'.
    cover_image: draft.trip.coverImage,
    // ce a rămas la pasul 2, dedus sau editat de om
    countries: draft.trip.countries,
  }

  const { data, error } = await supabase.rpc('publish_story', {
    p_stops: payload,
    p_trip: trip,
  })

  // funcția verifică totul înaintea scrierilor (migrarea 38), deci un
  // refuz vine ca mesaj propriu, fără date rămase în urmă — îl arătăm ca
  // atare, nu îl înlocuim cu unul generic
  if (error) throw new Error(error.message || 'Nu am putut publica.')

  const result = (data || {}) as { trip_id?: string | null; experience_id?: string | null }
  if (!result.trip_id) {
    throw new Error('Povestea s-a salvat, dar nu am putut lega locurile între ele. Verifică-le din profil.')
  }

  return {
    tripId: result.trip_id,
    experienceId: result.experience_id ?? null,
    href: `/trip/${result.trip_id}`,
  }
}
