'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, MapPin, Users } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { cn, CATEGORIES } from '@/lib/utils'
import { fetchFollowingIds, type SuggestedUser } from '@/lib/follows'

// aceeași listă de categorii ca în restul aplicației, nu una paralelă
const CHIPS = ['Toate', ...CATEGORIES]

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
  const [results, setResults] = useState<Location[]>([])
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const doSearch = useCallback(async (q: string, cat: string) => {
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

    const { data, error: searchError } = await req
    // fără asta, o căutare picată arată identic cu „niciun rezultat"
    setError(searchError ? 'Nu am putut încărca locurile. Verifică conexiunea și încearcă din nou.' : null)
    setResults(data || [])
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

  // Rulează și la montare (query gol) — doSearch filtrează mereu status = 'approved'
  useEffect(() => {
    const timer = setTimeout(
      () => (tab === 'locations' ? doSearch(query, activeChip) : searchUsers(query)),
      300
    )
    return () => clearTimeout(timer)
  }, [tab, query, activeChip, doSearch, searchUsers])

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="max-w-[680px] mx-auto">
        <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-4 pb-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-2">
              <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#0F0F0F] outline-none placeholder:text-[#9B9B9B]"
                placeholder={tab === 'locations' ? 'Caută locuri...' : 'Caută după nume sau @username...'}
                autoFocus
              />
              {loading && <Loader2 size={14} className="animate-spin text-[#9B9B9B] flex-shrink-0" />}
            </div>
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
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CHIPS.map(chip => (
                <button key={chip} onClick={() => setActiveChip(chip)} className={cn('whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-outfit font-medium border transition-all flex-shrink-0', activeChip === chip ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]')}>
                  {chip}
                </button>
              ))}
            </div>
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

          {((tab === 'locations' && results.length === 0) || (tab === 'users' && users.length === 0))
            && !loading && !error && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">Niciun rezultat</p>
              <p className="text-[13px] text-[#9B9B9B]">Încearcă alt termen de căutare</p>
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
                    : '📍'
                  }
                </div>
                <div className="flex-1 p-3.5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight pr-2">{loc.name}</h3>
                    {loc.score > 0 && <span className="bg-[#E8440A] text-white font-outfit text-[11px] font-bold px-2 py-0.5 rounded-xl flex-shrink-0">{loc.score.toFixed(1)}</span>}
                  </div>
                  <p className="text-[12px] text-[#9B9B9B] mb-1.5">📍 {loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                  <div className="flex items-center justify-between">
                    {loc.category && <span className="text-[10px] font-outfit font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8440A]">{loc.category}</span>}
                    <span className="text-[11px] text-[#9B9B9B]">{loc.experience_count} experiențe</span>
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
