'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Plus, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { ACTIVITY_CATEGORIES } from '@/lib/activities'
import {
  PLACES_ENABLED, getPlaceDetails, newSessionToken, searchPlaces, type PlaceSuggestion,
} from '@/lib/places'
import type { StopDraft } from '@/lib/story'

type DbLocation = { id: string; name: string; city: string | null; country: string | null }

type Props = {
  stop: StopDraft
  onChange: (patch: Partial<StopDraft>) => void
  /** oprirea 1 primește autofocus, restul nu */
  autoFocus?: boolean
}

/**
 * Un singur câmp pentru „unde ai fost sau ce ai făcut".
 *
 * Caută în paralel în Pocoloco și în Google, iar dacă nimic din liste nu
 * se potrivește oferă două ieșiri: locul e nou, sau nu e un loc, e ceva ce
 * ai făcut. Aceeași căutare pentru oprirea 1 și pentru restul.
 */
export default function SubjectPicker({ stop, onChange, autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const [dbResults, setDbResults] = useState<DbLocation[]>([])
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const sessionToken = useRef(newSessionToken())

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setDbResults([]); setPlaceResults([]); return }

    const timer = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()

      const [dbRes, places] = await Promise.all([
        supabase
          .from('locations')
          .select('id, name, city, country')
          .eq('status', 'approved')
          .ilike('name', `%${term}%`)
          .order('experience_count', { ascending: false })
          .limit(5),
        searchPlaces(term, sessionToken.current),
      ])

      setDbResults((dbRes.data || []) as DbLocation[])
      const known = new Set((dbRes.data || []).map((l: DbLocation) => l.name.toLowerCase()))
      setPlaceResults(places.filter(p => !known.has(p.mainText.toLowerCase())).slice(0, 5))
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const pickExisting = (loc: DbLocation) => {
    onChange({
      kind: 'place_visit',
      locationId: loc.id,
      locationName: loc.name,
      locationCity: loc.city || '',
      locationCountry: loc.country || 'România',
      lat: null,
      lng: null,
      placeId: null,
    })
    setQuery('')
  }

  const pickPlace = async (place: PlaceSuggestion) => {
    setSearching(true)
    const details = await getPlaceDetails(place.placeId, sessionToken.current)
    sessionToken.current = newSessionToken()

    onChange({
      kind: 'place_visit',
      locationId: null,
      locationName: details?.name || place.mainText,
      locationCity: details?.city || place.secondaryText.split(',')[0] || '',
      locationCountry: details?.country || 'România',
      lat: details?.latitude ?? null,
      lng: details?.longitude ?? null,
      placeId: place.placeId,
      locality: details?.locality ?? null,
      adminArea1: details?.adminArea1 ?? null,
      adminArea2: details?.adminArea2 ?? null,
      countryCode: details?.countryCode ?? null,
    })
    setQuery('')
    setSearching(false)
  }

  const useAsNewPlace = () => {
    onChange({
      kind: 'place_visit',
      locationId: null,
      locationName: query.trim(),
      lat: null,
      lng: null,
      placeId: null,
      locality: null,
      adminArea1: null,
      adminArea2: null,
      countryCode: null,
    })
    setQuery('')
  }

  const useAsActivity = () => {
    onChange({
      kind: 'activity',
      activityTitle: query.trim(),
      locationId: null,
      locationName: '',
      locationCity: '',
      lat: null,
      lng: null,
      placeId: null,
    })
    setQuery('')
  }

  const clear = () => onChange({
    kind: 'place_visit',
    locationId: null,
    locationName: '',
    locationCity: '',
    activityTitle: '',
    activityCategory: null,
    activityArea: '',
    lat: null,
    lng: null,
    placeId: null,
  })

  // ---- activitate aleasă ----
  if (stop.kind === 'activity') return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EEEDFB] flex items-center justify-center flex-shrink-0 text-lg">
          🪂
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={stop.activityTitle}
            onChange={e => onChange({ activityTitle: e.target.value.slice(0, 120) })}
            placeholder="Ce ai făcut?"
            className="w-full font-outfit text-[15px] font-semibold text-[#0F0F0F] bg-transparent outline-none placeholder:text-[#9B9B9B] placeholder:font-normal"
          />
          <input
            value={stop.activityArea}
            onChange={e => onChange({ activityArea: e.target.value.slice(0, 160) })}
            placeholder="Prin ce zonă? (opțional)"
            className="w-full text-[12px] text-[#6B6B6B] bg-transparent outline-none placeholder:text-[#9B9B9B] mt-0.5"
          />
        </div>
        <button onClick={clear} aria-label="Schimbă" className="text-[#9B9B9B] flex-shrink-0 mt-1">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => onChange({
              activityCategory: stop.activityCategory === category.id ? null : category.id,
            })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              stop.activityCategory === category.id
                ? 'bg-[#EEEDFB] text-[#5B4FCF] border-[rgba(91,79,207,0.25)]'
                : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
            }`}
          >
            {category.emoji} {category.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ---- loc ales ----
  if (stop.locationName) return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
          <MapPin size={18} className="text-[#E8440A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate">{stop.locationName}</p>
          <p className="text-[12px] text-[#9B9B9B] truncate">
            {stop.locationCity || 'Fără oraș'}{stop.locationCountry ? `, ${stop.locationCountry}` : ''}
          </p>
        </div>
        <button onClick={clear} aria-label="Schimbă" className="text-[#9B9B9B] flex-shrink-0 mt-1">
          <X size={16} />
        </button>
      </div>

      {!stop.locationId && (
        <>
          <input
            value={stop.locationCity}
            onChange={e => onChange({ locationCity: e.target.value })}
            placeholder="Prin ce oraș sau zonă? (opțional)"
            className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
          />
          <p className="text-[11px] text-[#9B9B9B] leading-relaxed">
            Locul ăsta e nou pentru noi. Îl adăugăm, dar apare în căutare abia după ce
            trece pe la un administrator. Ce scrii tu rămâne salvat.
          </p>
        </>
      )}
    </div>
  )

  // ---- nimic ales încă ----
  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Castelul Bran, snorkeling, o cafenea..."
          autoFocus={autoFocus}
          className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#9B9B9B]" />
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
          {dbResults.map(loc => (
            <button
              key={loc.id}
              onClick={() => pickExisting(loc)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)]"
            >
              <MapPin size={15} className="text-[#E8440A] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                <div className="text-[11px] text-[#9B9B9B] truncate">{loc.city || 'Fără oraș'}</div>
              </div>
              <span className="text-[9px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] flex-shrink-0">
                POCOLOCO
              </span>
            </button>
          ))}

          {placeResults.map(place => (
            <button
              key={place.placeId}
              onClick={() => pickPlace(place)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)]"
            >
              <MapPin size={15} className="text-[#5B4FCF] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{place.mainText}</div>
                <div className="text-[11px] text-[#9B9B9B] truncate">{place.secondaryText}</div>
              </div>
              <span className="text-[9px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#EEEDFB] text-[#5B4FCF] flex-shrink-0">
                GOOGLE
              </span>
            </button>
          ))}

          {query.trim().length >= 3 && (
            <button
              onClick={useAsActivity}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)]"
            >
              <span className="text-[15px] flex-shrink-0">🪂</span>
              <span className="text-[13px] text-[#6B6B6B] truncate">
                „<strong className="text-[#0F0F0F]">{query.trim()}</strong>&rdquo; nu e un loc, e ceva ce am făcut
              </span>
            </button>
          )}

          <button
            onClick={useAsNewPlace}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left"
          >
            <Plus size={15} className="text-[#6B6B6B] flex-shrink-0" />
            <span className="text-[13px] text-[#6B6B6B] truncate">
              Adaugă „<strong className="text-[#0F0F0F]">{query.trim()}</strong>&rdquo; ca loc nou
            </span>
          </button>
        </div>
      )}

      {!PLACES_ENABLED && query.trim().length >= 2 && (
        <p className="text-[11px] text-[#9B9B9B] mt-2 leading-relaxed">
          Căutăm doar în locurile deja aprobate. Sugestiile Google se activează după
          configurarea cheii — vezi docs/google-places-setup.md.
        </p>
      )}
    </div>
  )
}
