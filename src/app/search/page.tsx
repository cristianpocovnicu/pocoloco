'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Loader2, MapPin, Users, Clock, X, Star } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { cn, CATEGORIES, CATEGORY_ICONS } from '@/lib/utils'
import { fetchFollowingIds, type SuggestedUser } from '@/lib/follows'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/lib/recentSearches'

// aceeași listă de categorii ca în restul aplicației, nu una paralelă
const CHIPS = ['Toate', ...CATEGORIES]

const RATING_FILTERS = [
  { value: 0, label: 'Orice notă' },
  { value: 7, label: '7+' },
  { value: 8, label: '8+' },
  { value: 9, label: '9+' },
]

type Tab = 'locations' | 'users'

type Location = {
  id: string
  name: string
  city: string
  country: string
  category: string | null
  score: number
  experience_count: number
  cover_image: string | null
}

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>('locations')
  const [query, setQuery] = useState('')
  const [activeChip, setActiveChip] = useState('Toate')
  const [minScore, setMinScore] = useState(0)
  const [results, setResults] = useState<Location[]>([])
  const [users, setUsers] = useState<SuggestedUser[]>([])
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

  const doSearch = useCallback(async (q: string, cat: string, score: number) => {
    setLoading(true)
    const supabase = createClient()
    let req = supabase
      .from('locations')
      .select('id, name, city, country, category, score, experience_count, cover_image')
      .eq('status', 'approved')
      .order('experience_count', { ascending: false })
      .limit(30)

    if (q.trim()) req = req.ilike('name', `%${q.trim()}%`)
    if (cat !== 'Toate') req = req.eq('category', cat)
    if (score > 0) req = req.gte('score', score)

    const { data, error: searchError } = await req
    // fără asta, o căutare picată arată identic cu „niciun rezultat"
    setError(searchError ? 'Nu am putut încărca locurile. Verifică conexiunea și încearcă din nou.' : null)
    setResults(data || [])
    setLoading(false)
  }, [])

  const searchUsers = useCallback(async (q: string) => {
    setLoading(true)
    const supabase = createClient()

    let req = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_guide, bio')
      .order('xp', { ascending: false })
      .limit(20)

    // caută și în nume, și în username
    const term = q.trim()
    if (term) req = req.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)

    const { data, error: searchError } = await req
    if (searchError) {
      setError('Nu am putut încărca userii. Încearcă din nou.')
      setUsers([])
      setLoading(false)
      return
    }

    const profiles = (data || []) as Omit<SuggestedUser, 'experienceCount'>[]
    setError(null)

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

    setUsers(profiles.map(p => ({ ...p, experienceCount: counts[p.id] || 0 })))
    setLoading(false)
  }, [])

  // pe cine urmăresc deja, ca butoanele din rezultate să pornească corect
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setFollowingIds(await fetchFollowingIds(supabase, user.id))
    }
    load()
  }, [])

  // Rulează și la montare (query gol) — doSearch filtrează mereu status = 'approved'
  useEffect(() => {
    const timer = setTimeout(
      () => (tab === 'locations' ? doSearch(query, activeChip, minScore) : searchUsers(query)),
      300
    )
    return () => clearTimeout(timer)
  }, [tab, query, activeChip, minScore, doSearch, searchUsers])

  // sugestiile din dropdown, separat de rezultate ca să apară instant
  useEffect(() => {
    if (tab !== 'locations' || query.trim().length < 2) { setSuggestions([]); return }

    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('id, name, city, country, category, score, experience_count, cover_image')
        .eq('status', 'approved')
        .ilike('name', `%${query.trim()}%`)
        .order('experience_count', { ascending: false })
        .limit(6)
      setSuggestions((data || []) as Location[])
    }, 150)

    return () => clearTimeout(timer)
  }, [query, tab])

  const commitSearch = (term: string) => {
    setQuery(term)
    setRecent(addRecentSearch(term))
    setDropdownOpen(false)
  }

  const showRecent = dropdownOpen && query.trim().length < 2 && recent.length > 0
  const showSuggestions = dropdownOpen && tab === 'locations' && suggestions.length > 0

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="max-w-[680px] mx-auto">
        <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-4 pb-3 sticky top-0 z-30">
          <div ref={searchBoxRef} className="relative mb-3">
            <div className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-2">
              <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter') commitSearch(query); if (e.key === 'Escape') setDropdownOpen(false) }}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#0F0F0F] outline-none placeholder:text-[#9B9B9B]"
                placeholder={tab === 'locations' ? 'Caută locuri...' : 'Caută după nume sau @username...'}
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
                    <div className="w-8 h-8 rounded-lg bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {loc.cover_image
                        ? <img src={loc.cover_image} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm">{CATEGORY_ICONS[loc.category || ''] || '📍'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                      <div className="text-[11px] text-[#9B9B9B] truncate">
                        {loc.city}{loc.country ? `, ${loc.country}` : ''} · {loc.experience_count} experiențe
                      </div>
                    </div>
                    {loc.score > 0 && (
                      <span className="bg-[#FFF0EB] text-[#E8440A] font-outfit text-[11px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0">
                        {loc.score.toFixed(1)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Locuri / Useri */}
          <div className="flex gap-2 mb-3">
            {([
              { id: 'locations' as const, label: 'Locuri', Icon: MapPin },
              { id: 'users' as const, label: 'Useri', Icon: Users },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-outfit font-semibold border transition-all',
                  tab === id
                    ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                    : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
                )}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {tab === 'locations' && (
            <>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setActiveChip(chip)}
                    className={cn('whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-outfit font-medium border transition-all flex-shrink-0', activeChip === chip ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]')}
                  >
                    {chip !== 'Toate' && `${CATEGORY_ICONS[chip] || ''} `}{chip}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-[11px] text-[#9B9B9B] flex items-center gap-1 flex-shrink-0">
                  <Star size={11} /> Notă:
                </span>
                {RATING_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setMinScore(f.value)}
                    className={cn(
                      'whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-outfit font-medium border transition-all flex-shrink-0',
                      minScore === f.value
                        ? 'bg-[#5B4FCF] text-white border-[#5B4FCF]'
                        : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pt-4">
          {error && (
            <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-3">
              <p className="text-[13px] text-[#DC2626]">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-[#9B9B9B]">
                {tab === 'locations'
                  ? `${results.length} locuri găsite`
                  : `${users.length} ${users.length === 1 ? 'user găsit' : 'useri găsiți'}`}
              </span>
            </div>
          )}

          {/* Fără rezultate: categorii, nu un zero sec */}
          {tab === 'locations' && results.length === 0 && !loading && !error && (
            <div>
              <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] mb-5">
                <div className="text-4xl mb-2">🔍</div>
                <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">
                  {query.trim() || activeChip !== 'Toate' || minScore > 0 ? 'Niciun rezultat' : 'Ce cauți azi?'}
                </p>
                <p className="text-[13px] text-[#9B9B9B]">
                  {query.trim() || activeChip !== 'Toate' || minScore > 0
                    ? 'Încearcă alt termen sau relaxează filtrele'
                    : 'Alege o categorie ca să pornești'}
                </p>
              </div>

              <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-3">Categorii populare</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => { setActiveChip(category); setQuery(''); setMinScore(0) }}
                    className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex items-center gap-2.5 hover:border-[rgba(232,68,10,0.3)] transition-colors text-left"
                  >
                    <span className="text-2xl flex-shrink-0">{CATEGORY_ICONS[category]}</span>
                    <span className="font-outfit text-[13px] font-semibold text-[#0F0F0F] truncate">{category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'users' && users.length === 0 && !loading && !error && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">Niciun user găsit</p>
              <p className="text-[13px] text-[#9B9B9B]">Încearcă alt nume sau username</p>
            </div>
          )}

          {tab === 'users' && users.length > 0 && (
            <UserSuggestionList users={users} followingIds={followingIds} />
          )}

          <div className={cn('flex-col gap-3', tab === 'locations' ? 'flex' : 'hidden')}>
            {results.map(loc => (
              <Link key={loc.id} href={`/location/${loc.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors">
                <div className="w-24 flex-shrink-0 bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center text-4xl">
                  {loc.cover_image
                    ? <img src={loc.cover_image} alt={loc.name} className="w-full h-full object-cover" />
                    : (CATEGORY_ICONS[loc.category || ''] || '📍')
                  }
                </div>
                <div className="flex-1 p-3.5 min-w-0">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight">{loc.name}</h3>
                    {loc.score > 0 && <span className="bg-[#E8440A] text-white font-outfit text-[11px] font-bold px-2 py-0.5 rounded-xl flex-shrink-0">{loc.score.toFixed(1)}</span>}
                  </div>
                  <p className="text-[12px] text-[#9B9B9B] mb-1.5 truncate">📍 {loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                  <div className="flex items-center justify-between gap-2">
                    {loc.category && <span className="text-[10px] font-outfit font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8440A] truncate">{loc.category}</span>}
                    <span className="text-[11px] text-[#9B9B9B] flex-shrink-0">{loc.experience_count} experiențe</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
