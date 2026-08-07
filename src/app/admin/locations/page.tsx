'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, Check, X, Trash2, RotateCcw, MapPin, Crosshair, ImagePlus, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, statusStyle, type MiniProfile } from '@/lib/admin'
import { cn, timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'
import CoordinatesRow from '@/components/admin/CoordinatesRow'
import CoverImage from '@/components/ui/CoverImage'
import { attachGoogleCover } from '@/lib/location-cover'
import { PLACES_ENABLED, fetchPlaceGeography, geocodePlace, type PlaceGeography } from '@/lib/places'

type LocationRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  status: 'pending' | 'approved' | 'rejected'
  added_by: string | null
  experience_count: number | null
  cover_image: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  google_place_id?: string | null
  locality?: string | null
  admin_area_1?: string | null
  admin_area_2?: string | null
  country_code?: string | null
}

const BASE_COLUMNS = 'id, name, city, country, category, status, added_by, experience_count, cover_image, latitude, longitude, created_at'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'În așteptare' },
  { id: 'approved', label: 'Aprobate' },
  { id: 'rejected', label: 'Respinse' },
  { id: 'all', label: 'Toate' },
]

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [geocodingId, setGeocodingId] = useState<string | null>(null)
  const [bulk, setBulk] = useState<{ done: number; total: number; found: number } | null>(null)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [photoBulk, setPhotoBulk] = useState<{ done: number; total: number; found: number } | null>(null)
  const [photosSupported, setPhotosSupported] = useState(true)
  const [geoSupported, setGeoSupported] = useState(true)
  const [geoId, setGeoId] = useState<string | null>(null)
  const [geoBulk, setGeoBulk] = useState<{ done: number; total: number; found: number } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const query = (columns: string) => supabase
      .from('locations')
      .select(columns)
      .order('created_at', { ascending: false })
      .limit(300)

    // google_place_id vine din migrarea 020_20260807_location_photos; până e
    // rulată, pagina merge mai departe fără butoanele de poză
    // geografia vine din migrarea 37; până e rulată, pagina cade înapoi
    // pe forma de dinainte, apoi pe cea fără google_place_id
    let { data, error: fetchError } = await query(
      `${BASE_COLUMNS}, google_place_id, locality, admin_area_1, admin_area_2, country_code`
    )
    if (fetchError) {
      setGeoSupported(false)
      ;({ data, error: fetchError } = await query(`${BASE_COLUMNS}, google_place_id`))
    }
    if (fetchError) {
      setPhotosSupported(false)
      ;({ data, error: fetchError } = await query(BASE_COLUMNS))
    }

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as unknown as LocationRow[]
    setLocations(rows)
    setAuthors(await fetchProfilesMap(supabase, rows.map(r => r.added_by)))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: string, status: LocationRow['status']) => {
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('locations').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setLocations(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
      setError(null)
    }
    setBusyId(null)
  }

  /**
   * Ștergerea trece prin admin_delete_location (migrarea 36): ordinea
   * contează, iar funcția refuză dacă locul are experiențe scrise.
   * Înainte de confirmare spunem exact ce se pierde.
   */
  const remove = async (loc: LocationRow) => {
    setBusyId(loc.id)
    setError(null)
    const supabase = createClient()

    const [stopsRes, expRes] = await Promise.all([
      supabase.from('trip_locations').select('trip_id, experience_id').eq('location_id', loc.id),
      supabase.from('experiences').select('id, kind').eq('location_id', loc.id),
    ])

    const stops = (stopsRes.data || []) as { trip_id: string; experience_id: string | null }[]
    const experiences = (expRes.data || []) as { id: string; kind?: string | null }[]
    const written = experiences.filter(e => e.kind !== 'activity').length

    if (written > 0) {
      setError(
        `„${loc.name}" are ${written} ${written === 1 ? 'experiență scrisă' : 'experiențe scrise'} de useri, deci nu poate fi ștearsă. ` +
        'Dacă vrei s-o scoți din căutare și din feed, apasă „Respinge" — rămâne vizibilă doar autorului și vouă.'
      )
      setBusyId(null)
      return
    }

    const trips = new Set(stops.map(s => s.trip_id)).size
    const doarLocul = stops.filter(s => !s.experience_id).length
    const cuPoveste = stops.length - doarLocul

    const detalii = stops.length === 0
      ? 'Nu e folosită în nicio călătorie.'
      : `Folosită în ${trips} ${trips === 1 ? 'călătorie' : 'călătorii'} ` +
        `(${doarLocul} ${doarLocul === 1 ? 'oprire doar cu locația va dispărea' : 'opriri doar cu locația vor dispărea'}, ` +
        `${cuPoveste} ${cuPoveste === 1 ? 'oprire cu poveste rămâne' : 'opriri cu poveste rămân'} fără pin).`

    if (!window.confirm(`Ștergi definitiv „${loc.name}"?

${detalii}`)) {
      setBusyId(null)
      return
    }

    const { error: rpcError } = await supabase.rpc('admin_delete_location', { p_location_id: loc.id })

    if (rpcError) {
      setError(rpcError.message.includes('admin_delete_location')
        ? 'Ștergerea are nevoie de migrarea 36 (admin_delete_location).'
        : rpcError.message)
    } else {
      setLocations(prev => prev.filter(l => l.id !== loc.id))
      setError(null)
    }
    setBusyId(null)
  }

  const saveCoords = async (id: string, latitude: number | null, longitude: number | null) => {
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('locations')
      .update({ latitude, longitude })
      .eq('id', id)

    if (updateError) return updateError.message
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, latitude, longitude } : l)))
    return null
  }

  /**
   * Caută coordonatele după nume + oraș + țară și le salvează, împreună cu
   * place id-ul — de el are nevoie mai târziu preluarea pozei.
   */
  const geocodeOne = async (loc: LocationRow): Promise<boolean> => {
    const query = [loc.name, loc.city, loc.country].filter(Boolean).join(', ')
    const result = await geocodePlace(query)
    if (!result) return false

    const saveError = await saveCoords(loc.id, result.latitude, result.longitude)
    if (saveError) return false

    if (result.placeId) await savePlaceId(loc.id, result.placeId)
    // aceeași cerere ne-a adus și nivelurile administrative
    await saveGeography(loc.id, result)
    return true
  }

  const savePlaceId = async (id: string, placeId: string) => {
    if (!photosSupported) return
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('locations')
      .update({ google_place_id: placeId })
      .eq('id', id)

    if (updateError) {
      // coloana lipsește => migrarea nu e rulată; ascundem restul funcției
      setPhotosSupported(false)
      return
    }
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, google_place_id: placeId } : l)))
  }

  /** Scrie nivelurile administrative, dacă migrarea 37 e rulată. */
  const saveGeography = async (id: string, geo: PlaceGeography): Promise<boolean> => {
    if (!geoSupported) return false

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('locations')
      .update({
        locality: geo.locality,
        admin_area_1: geo.adminArea1,
        admin_area_2: geo.adminArea2,
        country_code: geo.countryCode,
      })
      .eq('id', id)

    if (updateError) {
      // coloanele lipsesc => migrarea nu e rulată; ascundem restul funcției
      setGeoSupported(false)
      return false
    }

    setLocations(prev => prev.map(l => (l.id === id ? {
      ...l,
      locality: geo.locality,
      admin_area_1: geo.adminArea1,
      admin_area_2: geo.adminArea2,
      country_code: geo.countryCode,
    } : l)))
    return true
  }

  /**
   * Geografia unei locații existente. Cu place_id o cerem direct; fără
   * el, îl căutăm întâi după nume, ca la butonul de poze.
   */
  const geographyOne = async (loc: LocationRow): Promise<boolean> => {
    let placeId = loc.google_place_id || null

    if (!placeId) {
      const query = [loc.name, loc.city, loc.country].filter(Boolean).join(', ')
      const result = await geocodePlace(query)
      if (!result) return false
      placeId = result.placeId
      if (placeId) await savePlaceId(loc.id, placeId)
      // geocodePlace aduce deja componentele: nu mai plătim o cerere
      return await saveGeography(loc.id, result)
    }

    const geo = await fetchPlaceGeography(placeId)
    if (!geo) return false
    return await saveGeography(loc.id, geo)
  }

  const handleGeographyOne = async (loc: LocationRow) => {
    setGeoId(loc.id)
    setError(null)
    const ok = await geographyOne(loc)
    if (!ok) setError(`Nu am găsit regiunea pentru „${loc.name}".`)
    setGeoId(null)
  }

  /** Ca la geocodare și la poze: secvențial, cu pauză între cereri. */
  const handleGeographyAll = async () => {
    const missing = locations.filter(l => !l.admin_area_1)
    if (missing.length === 0) return
    if (!window.confirm(`Caut regiunea pentru ${missing.length} locații. Poate dura câteva minute. Continui?`)) return

    setError(null)
    setGeoBulk({ done: 0, total: missing.length, found: 0 })

    let found = 0
    for (let i = 0; i < missing.length; i++) {
      const ok = await geographyOne(missing[i])
      if (ok) found++
      setGeoBulk({ done: i + 1, total: missing.length, found })
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 250))
    }

    setTimeout(() => setGeoBulk(null), 4000)
  }

  /**
   * Coperta din Google pentru o locație existentă. Dacă nu-i știm place
   * id-ul (locațiile vechi n-au unul), îl căutăm întâi după nume.
   */
  const photoOne = async (loc: LocationRow): Promise<boolean> => {
    let placeId = loc.google_place_id || null

    if (!placeId) {
      const query = [loc.name, loc.city, loc.country].filter(Boolean).join(', ')
      const result = await geocodePlace(query)
      placeId = result?.placeId || null
      if (!placeId) return false
      await savePlaceId(loc.id, placeId)
    }

    const supabase = createClient()
    const url = await attachGoogleCover(supabase, loc.id, placeId)
    if (!url) return false

    setLocations(prev => prev.map(l => (l.id === loc.id ? { ...l, cover_image: url } : l)))
    return true
  }

  const handlePhotoOne = async (loc: LocationRow) => {
    setPhotoId(loc.id)
    setError(null)
    const ok = await photoOne(loc)
    if (!ok) setError(`Nu am găsit o poză pentru „${loc.name}" în Google.`)
    setPhotoId(null)
  }

  /** Ca la geocodare: secvențial, cu pauză, ca să nu lovim limita de rată. */
  const handlePhotoAll = async () => {
    const missing = locations.filter(l => !l.cover_image)
    if (missing.length === 0) return
    if (!window.confirm(`Caut poze pentru ${missing.length} locații fără copertă. Poate dura câteva minute. Continui?`)) return

    setError(null)
    setPhotoBulk({ done: 0, total: missing.length, found: 0 })

    let found = 0
    for (let i = 0; i < missing.length; i++) {
      const ok = await photoOne(missing[i])
      if (ok) found++
      setPhotoBulk({ done: i + 1, total: missing.length, found })
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 250))
    }

    setTimeout(() => setPhotoBulk(null), 4000)
  }

  const handleGeocodeOne = async (loc: LocationRow) => {
    setGeocodingId(loc.id)
    setError(null)
    const ok = await geocodeOne(loc)
    if (!ok) setError(`Nu am găsit coordonate pentru „${loc.name}". Completează-le manual.`)
    setGeocodingId(null)
  }

  /**
   * Secvențial, nu în paralel: Places are limite de rată, iar o rafală de
   * cereri s-ar întoarce cu erori în loc de coordonate.
   */
  const handleGeocodeAll = async () => {
    const missing = locations.filter(l => l.latitude == null || l.longitude == null)
    if (missing.length === 0) return
    if (!window.confirm(`Caut coordonatele pentru ${missing.length} locații. Poate dura un minut. Continui?`)) return

    setError(null)
    setBulk({ done: 0, total: missing.length, found: 0 })

    let found = 0
    for (let i = 0; i < missing.length; i++) {
      const ok = await geocodeOne(missing[i])
      if (ok) found++
      setBulk({ done: i + 1, total: missing.length, found })
      // pauză scurtă, ca să nu lovim limita de rată
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 250))
    }

    setTimeout(() => setBulk(null), 4000)
  }

  const q = query.trim().toLowerCase()
  const visible = locations.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (!q) return true
    return l.name.toLowerCase().includes(q) || (l.city || '').toLowerCase().includes(q)
  })

  const missingCoords = locations.filter(l => l.latitude == null || l.longitude == null).length
  const withoutCover = locations.filter(l => !l.cover_image)
  const missingCovers = withoutCover.length
  const withoutGeo = locations.filter(l => !l.admin_area_1)
  const missingGeo = withoutGeo.length

  const counts = {
    pending: locations.filter(l => l.status === 'pending').length,
    approved: locations.filter(l => l.status === 'approved').length,
    rejected: locations.filter(l => l.status === 'rejected').length,
    all: locations.length,
  }

  return (
    <div>
      <AdminHeader
        title="Locații"
        subtitle={counts.pending > 0 ? `${counts.pending} locații așteaptă aprobarea` : 'Nicio locație în așteptare'}
      />

      <div className="p-5 md:p-6">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-[12px] rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'text-[11px] px-3 py-1.5 rounded-full font-outfit font-medium border whitespace-nowrap flex-shrink-0',
                  filter === f.id
                    ? 'bg-[#E8440A] text-white border-[#E8440A]'
                    : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
                )}
              >
                {f.label} ({counts[f.id]})
              </button>
            ))}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1.5">
            <Search size={13} className="text-[#9B9B9B] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9B9B9B]"
              placeholder="Caută locație sau oraș..."
            />
          </div>
        </div>

        {/* Geocodare în masă */}
        {missingCoords > 0 && (
          <div className="bg-white border border-[rgba(217,119,6,0.25)] rounded-2xl px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0F0F0F]">
                {missingCoords} {missingCoords === 1 ? 'locație nu are coordonate' : 'locații nu au coordonate'}
              </p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                {PLACES_ENABLED
                  ? 'Fără ele nu apar pe hartă și nu au vecini în „În apropiere".'
                  : 'Completează-le manual sau configurează cheia Google Places — vezi docs/google-places-setup.md.'}
              </p>
            </div>

            {bulk ? (
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-32 h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B4FCF] rounded-full transition-all"
                    style={{ width: `${(bulk.done / bulk.total) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] text-[#6B6B6B] whitespace-nowrap">
                  {bulk.done}/{bulk.total} · {bulk.found} găsite
                </span>
              </div>
            ) : PLACES_ENABLED && (
              <button
                onClick={handleGeocodeAll}
                className="bg-[#5B4FCF] text-white font-outfit text-[12px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 flex-shrink-0"
              >
                <Crosshair size={13} /> Geocodează toate
              </button>
            )}
          </div>
        )}

        {/* Regiuni din Google */}
        {PLACES_ENABLED && geoSupported && missingGeo > 0 && (
          <div className="bg-white border border-[rgba(0,0,0,0.25)] rounded-2xl px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0F0F0F]">
                {missingGeo} {missingGeo === 1 ? 'locație nu are regiune' : 'locații nu au regiune'}
              </p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                Fără ea, o căutare după „Madeira&rdquo; nu găsește locurile de pe insulă — doar
                pe cele care au cuvântul în nume.
              </p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-1.5">
                {withoutGeo.slice(0, 10).map((loc, i) => (
                  <span key={loc.id}>
                    {i > 0 && ', '}
                    <a
                      href={`/location/${loc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5B4FCF] hover:underline"
                    >
                      {loc.name}
                    </a>
                  </span>
                ))}
                {missingGeo > 10 && ` și încă ${missingGeo - 10}`}
              </p>
            </div>

            {geoBulk ? (
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-32 h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F0F0F] rounded-full transition-all"
                    style={{ width: `${(geoBulk.done / geoBulk.total) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] text-[#6B6B6B] whitespace-nowrap">
                  {geoBulk.done}/{geoBulk.total} · {geoBulk.found} găsite
                </span>
              </div>
            ) : (
              <button
                onClick={handleGeographyAll}
                className="bg-[#0F0F0F] text-white font-outfit text-[12px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 flex-shrink-0"
              >
                <Globe size={13} /> Regiuni pentru toate
              </button>
            )}
          </div>
        )}

        {/* Coperte din Google */}
        {PLACES_ENABLED && photosSupported && missingCovers > 0 && (
          <div className="bg-white border border-[rgba(91,79,207,0.25)] rounded-2xl px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0F0F0F]">
                {missingCovers} {missingCovers === 1 ? 'locație nu are copertă' : 'locații nu au copertă'}
              </p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                Aducem prima poză a locului din Google. Unde nu există poză, locația rămâne
                cu imaginea din experiențe.
              </p>

              {/* numele lor, ca să poți intra direct la ce te interesează */}
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-1.5">
                {withoutCover.slice(0, 10).map((loc, i) => (
                  <span key={loc.id}>
                    {i > 0 && ', '}
                    <a
                      href={`/location/${loc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5B4FCF] hover:underline"
                    >
                      {loc.name}
                    </a>
                  </span>
                ))}
                {missingCovers > 10 && ` și încă ${missingCovers - 10}`}
              </p>
            </div>

            {photoBulk ? (
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-32 h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B4FCF] rounded-full transition-all"
                    style={{ width: `${(photoBulk.done / photoBulk.total) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] text-[#6B6B6B] whitespace-nowrap">
                  {photoBulk.done}/{photoBulk.total} · {photoBulk.found} găsite
                </span>
              </div>
            ) : (
              <button
                onClick={handlePhotoAll}
                className="bg-[#5B4FCF] text-white font-outfit text-[12px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 flex-shrink-0"
              >
                <ImagePlus size={13} /> Poze pentru toate
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#E8440A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] py-16 text-center">
            <p className="text-[13px] text-[#9B9B9B]">Nicio locație în această categorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map(loc => {
              const author = loc.added_by ? authors[loc.added_by] : null
              const style = statusStyle(loc.status)
              const busy = busyId === loc.id
              return (
                <div key={loc.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {loc.cover_image
                      ? <CoverImage src={loc.cover_image} sizes="48px" />
                      : <MapPin size={18} className="text-[#9B9B9B]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{loc.name}</h3>
                      <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${style.className}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6B6B6B] truncate">
                      📍 {loc.city || 'Fără oraș'}{loc.country ? `, ${loc.country}` : ''}
                      {loc.admin_area_1 ? ` · regiune: ${loc.admin_area_1}` : ''}
                      {loc.category ? ` · ${loc.category}` : ''}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] mt-0.5 mb-2">
                      Adăugată de {author ? `@${author.username || author.full_name}` : 'user necunoscut'} · {timeAgo(loc.created_at)}
                      {loc.experience_count ? ` · ${loc.experience_count} experiențe` : ''}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CoordinatesRow
                        latitude={loc.latitude}
                        longitude={loc.longitude}
                        geocoding={geocodingId === loc.id || !!bulk}
                        placesEnabled={PLACES_ENABLED}
                        onGeocode={() => handleGeocodeOne(loc)}
                        onSave={(lat, lng) => saveCoords(loc.id, lat, lng)}
                      />

                      {PLACES_ENABLED && geoSupported && !loc.admin_area_1 && (
                        <button
                          onClick={() => handleGeographyOne(loc)}
                          disabled={geoId === loc.id || !!geoBulk}
                          title="Completează regiunea din Google"
                          className="text-[11px] bg-[#F1F1F1] text-[#0F0F0F] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          {geoId === loc.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Globe size={11} />}
                          Regiune
                        </button>
                      )}

                      {PLACES_ENABLED && photosSupported && !loc.cover_image && (
                        <button
                          onClick={() => handlePhotoOne(loc)}
                          disabled={photoId === loc.id || !!photoBulk}
                          title="Aduce prima poză a locului din Google"
                          className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          {photoId === loc.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <ImagePlus size={11} />}
                          Adaugă poză din Google
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap md:justify-end flex-shrink-0">
                    {loc.status !== 'approved' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'approved')}
                        className="text-[11px] bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check size={12} /> Aprobă
                      </button>
                    )}
                    {loc.status !== 'rejected' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'rejected')}
                        className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <X size={12} /> Respinge
                      </button>
                    )}
                    {loc.status !== 'pending' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'pending')}
                        className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw size={12} /> În așteptare
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => remove(loc)}
                      className="text-[11px] bg-[#F8F7F5] text-[#6B6B6B] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Șterge
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
