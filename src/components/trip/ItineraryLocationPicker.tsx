'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, MapPin, PenLine, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { attachGoogleCover } from '@/lib/location-cover'
import {
  PLACES_ENABLED, getPlaceDetails, newSessionToken, searchPlaces, type PlaceSuggestion,
} from '@/lib/places'

export type PickedLocation = {
  id: string
  name: string
  city: string | null
  /** de unde a venit, ca să putem eticheta oprirea în listă */
  source: 'own' | 'pocoloco' | 'google'
}

type Props = {
  onPick: (location: PickedLocation) => void
  /** locațiile deja în itinerar, ca să nu le mai propunem */
  excludeIds: string[]
}

type Row = { id: string; name: string; city: string | null }

/**
 * Trei surse, în ordinea în care contează pentru cineva care își
 * povestește călătoria:
 *   1. locurile despre care a scris deja — punctul lui de plecare
 *   2. locurile din Pocoloco
 *   3. Google, care creează pe loc o locație nouă, în moderare
 */
export default function ItineraryLocationPicker({ onPick, excludeIds }: Props) {
  const [query, setQuery] = useState('')
  const [ownLocations, setOwnLocations] = useState<Row[]>([])
  const [dbResults, setDbResults] = useState<Row[]>([])
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState(() => newSessionToken())

  // locurile proprii, aduse o dată — lista de pornire, înainte de orice tastare
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: exps } = await supabase
        .from('experiences')
        .select('location_id')
        .eq('author_id', user.id)
        .eq('status', 'active')
        .limit(200)

      const ids = Array.from(new Set((exps || []).map((e: { location_id: string }) => e.location_id).filter(Boolean)))
      if (ids.length === 0) return

      const { data: locs } = await supabase
        .from('locations')
        .select('id, name, city')
        .in('id', ids)

      setOwnLocations((locs || []) as Row[])
    }
    load()
  }, [])

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setDbResults([]); setPlaceResults([]); return }

    setSearching(true)
    const supabase = createClient()

    const [dbRes, places] = await Promise.all([
      supabase
        .from('locations')
        .select('id, name, city')
        .eq('status', 'approved')
        .ilike('name', `%${term.trim()}%`)
        .order('experience_count', { ascending: false })
        .limit(6),
      searchPlaces(term, sessionToken),
    ])

    const rows = (dbRes.data || []) as Row[]
    setDbResults(rows)

    // nu repetăm în lista Google locurile pe care le avem deja
    const known = new Set([...rows, ...ownLocations].map(r => r.name.toLowerCase()))
    setPlaceResults(places.filter(p => !known.has(p.mainText.toLowerCase())).slice(0, 4))
    setSearching(false)
  }, [sessionToken, ownLocations])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const pick = (row: Row, source: PickedLocation['source']) => {
    onPick({ id: row.id, name: row.name, city: row.city, source })
    setQuery('')
    setDbResults([])
    setPlaceResults([])
  }

  /**
   * Un loc din Google devine locație în Pocoloco pe loc, cu status pending.
   * Moderarea rămâne asincronă — nu blocăm publicarea călătoriei.
   */
  const pickFromGoogle = async (place: PlaceSuggestion) => {
    setCreating(place.placeId)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(null); return }

    const details = await getPlaceDetails(place.placeId, sessionToken)
    setSessionToken(newSessionToken())

    const name = details?.name || place.mainText
    const city = details?.city || place.secondaryText.split(',')[0] || ''

    // dacă locul există deja sub același nume, îl refolosim
    const { data: existing } = await supabase
      .from('locations')
      .select('id, name, city')
      .ilike('name', name)
      .limit(1)
      .maybeSingle()

    if (existing) {
      pick(existing as Row, 'pocoloco')
      setCreating(null)
      return
    }

    const { data: created, error: insertError } = await supabase
      .from('locations')
      .insert({
        name,
        city,
        country: details?.country || 'România',
        latitude: details?.latitude ?? null,
        longitude: details?.longitude ?? null,
        google_place_id: place.placeId,
        status: 'pending',
        added_by: user.id,
      })
      .select('id, name, city')
      .single()

    if (insertError || !created) {
      setError('Nu am putut adăuga locul. Încearcă din nou.')
      setCreating(null)
      return
    }

    // coperta din Google: pornită în fundal, nu blochează alegerea locului
    void attachGoogleCover(supabase, created.id, place.placeId)

    pick(created as Row, 'google')
    setCreating(null)
  }

  const taken = new Set(excludeIds)
  const ownVisible = ownLocations
    .filter(l => !taken.has(l.id))
    .filter(l => (query.trim() ? l.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
    .slice(0, 6)
  const dbVisible = dbResults.filter(l => !taken.has(l.id) && !ownVisible.some(o => o.id === l.id))

  return (
    <div>
      <div className="flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 mb-3">
        <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Caută un loc..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-[#9B9B9B]"
        />
        {searching && <Loader2 size={14} className="animate-spin text-[#9B9B9B] flex-shrink-0" />}
      </div>

      {error && <p className="text-[12px] text-[#DC2626] mb-2">{error}</p>}

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
        {/* 1. Locurile tale */}
        {ownVisible.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1.5 text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide">
              Locurile tale
            </div>
            {ownVisible.map(loc => (
              <button
                key={`own-${loc.id}`}
                onClick={() => pick(loc, 'own')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)]"
              >
                <PenLine size={15} className="text-[#059669] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                  <div className="text-[11px] text-[#9B9B9B] truncate">{loc.city || 'Fără oraș'}</div>
                </div>
                <span className="text-[9px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] flex-shrink-0 whitespace-nowrap">
                  ✍️ AI SCRIS
                </span>
              </button>
            ))}
          </>
        )}

        {/* 2. Pocoloco */}
        {dbVisible.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1.5 text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide">
              Din Pocoloco
            </div>
            {dbVisible.map(loc => (
              <button
                key={`db-${loc.id}`}
                onClick={() => pick(loc, 'pocoloco')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)]"
              >
                <MapPin size={15} className="text-[#E8440A] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                  <div className="text-[11px] text-[#9B9B9B] truncate">{loc.city || 'Fără oraș'}</div>
                </div>
                <Plus size={15} className="text-[#5B4FCF] flex-shrink-0" />
              </button>
            ))}
          </>
        )}

        {/* 3. Google */}
        {placeResults.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1.5 text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide">
              De pe Google · intră în moderare
            </div>
            {placeResults.map(place => (
              <button
                key={place.placeId}
                onClick={() => pickFromGoogle(place)}
                disabled={creating !== null}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)] last:border-0 disabled:opacity-50"
              >
                <MapPin size={15} className="text-[#5B4FCF] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{place.mainText}</div>
                  <div className="text-[11px] text-[#9B9B9B] truncate">{place.secondaryText}</div>
                </div>
                {creating === place.placeId
                  ? <Loader2 size={14} className="animate-spin text-[#5B4FCF] flex-shrink-0" />
                  : <Plus size={15} className="text-[#5B4FCF] flex-shrink-0" />}
              </button>
            ))}
          </>
        )}

        {ownVisible.length === 0 && dbVisible.length === 0 && placeResults.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-[#9B9B9B] text-center">
            {query.trim().length >= 2
              ? searching ? 'Caut...' : 'Niciun rezultat. Încearcă alt nume.'
              : 'Scrie numele unui loc ca să-l cauți.'}
          </p>
        )}
      </div>

      {!PLACES_ENABLED && (
        <p className="text-[11px] text-[#9B9B9B] mt-2">
          Sugestiile Google se activează după configurarea cheii — vezi docs/google-places-setup.md.
        </p>
      )}
    </div>
  )
}
