'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Loader2, Clock, X, LayoutList, Map as MapIcon, Bookmark, Calendar, Globe } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import NotificationBell from '@/components/layout/NotificationBell'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { cn, formatCount, CATEGORY_ICONS } from '@/lib/utils'
import { activityLabel } from '@/lib/activities'
import { fetchFollowingIds, type SuggestedUser } from '@/lib/follows'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/lib/recentSearches'
import { LocationRowSkeleton } from '@/components/ui/Skeleton'
import { fetchLocationCovers } from '@/lib/covers'
import DynamicMap from '@/components/map/DynamicMap'
import CoverImage from '@/components/ui/CoverImage'
import TripKindBadge from '@/components/trip/TripKindBadge'
import type { Trip } from '@/lib/trips'

type ActivityResult = {
  id: string
  title: string | null
  activity_category: string | null
  activity_area: string | null
  images: string[] | null
  upvotes: number | null
  created_at: string
}

type Location = {
  id: string
  name: string
  city: string
  country: string
  category: string | null
  score: number
  experience_count: number
  cover_image: string | null
  latitude: number | null
  longitude: number | null
}

type View = 'list' | 'map'
type SectionId = 'locations' | 'trips' | 'activities' | 'users'

/** Câte rezultate arată o secțiune până apasă cineva „Vezi toate". */
const PREVIEW = 5

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('list')
  const [expanded, setExpanded] = useState<SectionId[]>([])

  const [locations, setLocations] = useState<Location[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [activities, setActivities] = useState<ActivityResult[]>([])
  const [users, setUsers] = useState<SuggestedUser[]>([])

  const [covers, setCovers] = useState<Record<string, string>>({})
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // autocomplete
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setRecent(getRecentSearches()) }, [])

  // click în afara casetei închide dropdownul
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const searchUsers = useCallback(async (term: string) => {
    const supabase = createClient()
    let req = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_guide, bio')
      .order('created_at', { ascending: false })
      .limit(20)

    // caută și în nume, și în username
    if (term) req = req.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)

    const { data, error: usersError } = await req
    if (usersError) return null

    const profiles = (data || []) as Omit<SuggestedUser, 'experienceCount'>[]

    // numărul de experiențe, dintr-un singur query pentru toți
    const counts: Record<string, number> = {}
    if (profiles.length > 0) {
      const { data: exps } = await supabase
        .from('experiences')
        .select('author_id')
        .eq('status', 'active')
        .in('author_id', profiles.map(p => p.id))
      for (const row of (exps || []) as { author_id: string }[]) {
        counts[row.author_id] = (counts[row.author_id] || 0) + 1
      }
    }

    return profiles.map(p => ({ ...p, experienceCount: counts[p.id] || 0 }))
  }, [])

  /**
   * O singură căutare, patru răspunsuri.
   *
   * Toate trec prin aceleași funcții ca înainte (migrarea 37): locurile
   * caută și în geografie, călătoriile în titlu, activitățile în titlu —
   * toate cu diacriticele normalizate de `search_normalize`. Diferența e
   * doar că nu mai trebuie ales tipul înainte de a scrie.
   */
  const runSearch = useCallback(async (raw: string) => {
    setLoading(true)
    const term = raw.trim()
    const supabase = createClient()

    const [locationsRes, tripsRes, activitiesRes, userRows] = await Promise.all([
      supabase.rpc('search_locations', { p_term: term, p_category: null, p_min_score: 0, p_limit: 30 }),
      supabase.rpc('search_trips', { p_term: term, p_sort: 'popular', p_limit: 20 }),
      supabase.rpc('search_activities', { p_term: term, p_limit: 30 }),
      searchUsers(term),
    ])

    // o căutare picată nu trebuie să arate ca „niciun rezultat”; dar dacă
    // doar una din patru a picat, restul rămân utile
    setError(locationsRes.error || !userRows
      ? 'Nu am putut încărca toate rezultatele. Verifică conexiunea și încearcă din nou.'
      : null)

    const foundLocations = (locationsRes.data || []) as Location[]
    setLocations(foundLocations)
    // funcțiile vin din migrarea 37; până e rulată, secțiunile rămân goale
    setTrips(tripsRes.error ? [] : ((tripsRes.data || []) as Trip[]))
    setActivities(activitiesRes.error ? [] : ((activitiesRes.data || []) as ActivityResult[]))
    setUsers(userRows || [])

    const missing = foundLocations.filter(l => !l.cover_image).map(l => l.id)
    if (missing.length > 0) {
      const found = await fetchLocationCovers(supabase, missing)
      setCovers(prev => ({ ...prev, ...found }))
    }

    setLoading(false)
  }, [searchUsers])

  // pe cine urmăresc deja, ca butoanele din rezultate să pornească corect
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setFollowingIds(await fetchFollowingIds(supabase, user.id))
    }
    load()
  }, [])

  // rulează și la montare, cu termen gol: pagina e și listă de răsfoit
  useEffect(() => {
    const timer = setTimeout(() => { runSearch(query); setExpanded([]) }, 300)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  // sugestiile din dropdown, separat de rezultate ca să apară instant
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return }

    const timer = setTimeout(async () => {
      const supabase = createClient()
      // aceeași funcție ca la rezultate, doar cu o limită mai mică
      const { data } = await supabase.rpc('search_locations', {
        p_term: query.trim(),
        p_category: null,
        p_min_score: 0,
        p_limit: 6,
      })
      setSuggestions((data || []) as Location[])
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  const commitSearch = (term: string) => {
    setQuery(term)
    setRecent(addRecentSearch(term))
    setDropdownOpen(false)
  }

  const toggleSection = (id: SectionId) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]))

  const showRecent = dropdownOpen && query.trim().length < 2 && recent.length > 0
  const showSuggestions = dropdownOpen && suggestions.length > 0
  const total = locations.length + trips.length + activities.length + users.length

  /** Antetul unei secțiuni + butonul care o expandează. */
  const sectionHead = (id: SectionId, label: string, count: number, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">
        {label} <span className="text-[#9B9B9B] font-normal">{count}</span>
      </h2>
      <div className="flex items-center gap-2 flex-shrink-0">
        {extra}
        {count > PREVIEW && (
          <button
            onClick={() => toggleSection(id)}
            className="text-[12px] text-[#E8440A] font-medium"
          >
            {expanded.includes(id) ? 'Arată mai puțin' : `Vezi toate (${count})`}
          </button>
        )}
      </div>
    </div>
  )

  const slice = <T,>(rows: T[], id: SectionId) => (expanded.includes(id) ? rows : rows.slice(0, PREVIEW))

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="max-w-[780px] mx-auto">
        <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-4 pb-3 sticky top-0 z-30">
          <div className="flex items-start gap-2">
            <div ref={searchBoxRef} className="relative flex-1 min-w-0">
              <div className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-2">
                <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  onKeyDown={e => { if (e.key === 'Enter') commitSearch(query); if (e.key === 'Escape') setDropdownOpen(false) }}
                  className="flex-1 min-w-0 bg-transparent text-sm text-[#0F0F0F] outline-none placeholder:text-[#9B9B9B]"
                  placeholder="Caută locuri, călătorii, oameni..."
                  autoFocus
                />
                {query && (
                  <button onClick={() => { setQuery(''); setSuggestions([]) }} aria-label="Șterge căutarea">
                    <X size={14} className="text-[#9B9B9B]" />
                  </button>
                )}
                {loading && <Loader2 size={14} className="animate-spin text-[#9B9B9B] flex-shrink-0" />}
              </div>

              {/* Autocomplete + căutări recente */}
              {(showSuggestions || showRecent) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-lg z-40 overflow-hidden">
                  {showRecent && (
                    <>
                      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                        <span className="text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide">Căutări recente</span>
                        <button
                          onClick={() => { clearRecentSearches(); setRecent([]) }}
                          className="text-[11px] text-[#E8440A] font-medium"
                        >
                          Șterge
                        </button>
                      </div>
                      {recent.map(term => (
                        <button
                          key={term}
                          onClick={() => commitSearch(term)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] text-left"
                        >
                          <Clock size={14} className="text-[#9B9B9B] flex-shrink-0" />
                          <span className="text-[13px] text-[#0F0F0F] truncate">{term}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {showSuggestions && suggestions.map(loc => (
                    <Link
                      key={loc.id}
                      href={`/location/${loc.id}`}
                      onClick={() => addRecentSearch(query)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] border-b border-[rgba(0,0,0,0.05)] last:border-0"
                    >
                      <div className="relative w-8 h-8 rounded-lg bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {loc.cover_image
                          ? <CoverImage src={loc.cover_image} sizes="32px" />
                          : <span className="text-sm">{CATEGORY_ICONS[loc.category || ''] || '📍'}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                        <div className="text-[11px] text-[#9B9B9B] truncate">
                          {loc.city}{loc.country ? `, ${loc.country}` : ''} · {loc.experience_count} experiențe
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NotificationBell className="mt-0.5" />
          </div>
        </div>

        <div className="px-5 pt-4">
          {error && (
            <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-3">
              <p className="text-[13px] text-[#DC2626]">{error}</p>
            </div>
          )}

          {/* prima încărcare: schelet, nu spinner */}
          {loading && total === 0 && (
            <div className="flex flex-col gap-3">
              <LocationRowSkeleton />
              <LocationRowSkeleton />
              <LocationRowSkeleton />
            </div>
          )}

          {!loading && total === 0 && !error && (
            <div className="text-center py-10 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">
                {query.trim() ? 'Niciun rezultat' : 'Nimic de arătat încă'}
              </p>
              <p className="text-[13px] text-[#9B9B9B]">
                {query.trim()
                  ? 'Încearcă alt termen — căutarea nu ține cont de diacritice.'
                  : 'Fii primul care povestește un loc.'}
              </p>
            </div>
          )}

          {/* ------------------------------------------------- Locuri */}
          {locations.length > 0 && (
            <section className="mb-6">
              {sectionHead('locations', 'Locuri', locations.length, (
                <div className="flex bg-white border border-[rgba(0,0,0,0.08)] rounded-full p-0.5">
                  {([
                    { id: 'list' as const, label: 'Listă', Icon: LayoutList },
                    { id: 'map' as const, label: 'Hartă', Icon: MapIcon },
                  ]).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setView(id)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-outfit font-medium transition-colors',
                        view === id ? 'bg-[#0F0F0F] text-white' : 'text-[#6B6B6B]'
                      )}
                    >
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>
              ))}

              {view === 'map' ? (
                <div>
                  <DynamicMap
                    height={420}
                    markers={locations
                      .filter(loc => loc.latitude != null && loc.longitude != null)
                      .map(loc => ({
                        id: loc.id,
                        lat: loc.latitude as number,
                        lng: loc.longitude as number,
                        name: loc.name,
                        subtitle: loc.city || loc.country || '',
                        score: loc.score,
                        href: `/location/${loc.id}`,
                      }))}
                  />
                  {(() => {
                    const withoutCoords = locations.filter(loc => loc.latitude == null || loc.longitude == null).length
                    if (withoutCoords === 0) return null
                    return (
                      <p className="text-[11px] text-[#9B9B9B] mt-2.5">
                        {withoutCoords} {withoutCoords === 1 ? 'loc nu are coordonate' : 'locuri nu au coordonate'} și
                        {withoutCoords === 1 ? ' apare' : ' apar'} doar în listă.
                      </p>
                    )
                  })()}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {slice(locations, 'locations').map(loc => (
                    <Link key={loc.id} href={`/location/${loc.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors">
                      <div className="relative w-24 flex-shrink-0 bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center text-4xl">
                        {loc.cover_image || covers[loc.id]
                          ? <CoverImage src={(loc.cover_image || covers[loc.id]) as string} alt={loc.name} sizes="96px" />
                          : (CATEGORY_ICONS[loc.category || ''] || '📍')}
                      </div>
                      <div className="flex-1 p-3.5 min-w-0">
                        <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight mb-1">{loc.name}</h3>
                        <p className="text-[12px] text-[#9B9B9B] mb-1.5 truncate">📍 {loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                        <span className="text-[11px] text-[#9B9B9B]">{loc.experience_count} experiențe</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* --------------------------------------------- Călătorii */}
          {trips.length > 0 && (
            <section className="mb-6">
              {sectionHead('trips', 'Călătorii', trips.length)}
              <div className="flex flex-col gap-2.5">
                {slice(trips, 'trips').map(trip => (
                  <Link
                    key={trip.id}
                    href={`/trip/${trip.id}`}
                    className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors"
                  >
                    <div className="relative w-24 flex-shrink-0 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] flex items-center justify-center text-3xl">
                      {trip.cover_image
                        ? <CoverImage src={trip.cover_image} alt={trip.title} sizes="96px" />
                        : <span className="opacity-50">🧭</span>}
                    </div>
                    <div className="flex-1 p-3.5 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TripKindBadge isGuide={trip.is_guide} />
                      </div>
                      <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight mb-1 truncate">
                        {trip.title}
                      </h3>
                      <div className="flex items-center gap-2.5 text-[11px] text-[#9B9B9B] flex-wrap">
                        {trip.countries?.length
                          ? <span className="flex items-center gap-1 truncate"><Globe size={10} /> {trip.countries.join(', ')}</span>
                          : null}
                        {trip.duration_days
                          ? <span className="flex items-center gap-1"><Calendar size={10} /> {trip.duration_days} zile</span>
                          : null}
                        {(trip.save_count || 0) > 0 && (
                          <span className="flex items-center gap-1"><Bookmark size={10} /> {formatCount(trip.save_count || 0)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------- Activități */}
          {activities.length > 0 && (
            <section className="mb-6">
              {sectionHead('activities', 'Activități', activities.length)}
              <div className="flex flex-col gap-2.5">
                {slice(activities, 'activities').map(activity => (
                  <Link
                    key={activity.id}
                    href={`/experience/${activity.id}`}
                    className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors"
                  >
                    <div className="relative w-24 flex-shrink-0 bg-[#EEEDFB] flex items-center justify-center text-3xl">
                      {activity.images?.[0]
                        ? <CoverImage src={activity.images[0]} alt={activity.title || ''} sizes="96px" />
                        : '🪂'}
                    </div>
                    <div className="flex-1 p-3.5 min-w-0">
                      <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight mb-1 truncate">
                        {activity.title}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2 py-0.5 rounded-full font-outfit font-semibold">
                          {activityLabel(activity.activity_category) || 'Activitate'}
                        </span>
                        {activity.activity_area && (
                          <span className="text-[12px] text-[#9B9B9B] truncate">📍 {activity.activity_area}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------- Useri */}
          {users.length > 0 && (
            <section className="mb-6">
              {sectionHead('users', 'Oameni', users.length)}
              <UserSuggestionList users={slice(users, 'users')} followingIds={followingIds} />
            </section>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
