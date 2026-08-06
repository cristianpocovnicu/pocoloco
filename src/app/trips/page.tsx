'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bookmark, Calendar, Globe, Loader2, MapPin, Plus, Route, Search } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, colorFor, initialsOf, type MiniProfile } from '@/lib/profiles'
import { cn, formatCount, timeAgo, TRANSPORT_TYPES } from '@/lib/utils'
import type { Trip } from '@/lib/trips'
import CoverImage from '@/components/ui/CoverImage'

type SortKey = 'popular' | 'recent'

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'popular', label: 'Populare' },
  { id: 'recent', label: 'Recente' },
]

const PAGE_SIZE = 20

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({})
  const [sort, setSort] = useState<SortKey>('popular')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (sortKey: SortKey, q: string) => {
    setLoading(true)
    const supabase = createClient()

    let request = supabase
      .from('trips')
      .select('*')
      .eq('status', 'active')
      .limit(PAGE_SIZE)

    request = sortKey === 'popular'
      ? request.order('save_count', { ascending: false }).order('created_at', { ascending: false })
      : request.order('created_at', { ascending: false })

    if (q.trim()) request = request.ilike('title', `%${q.trim()}%`)

    const { data, error: loadError } = await request
    setError(loadError ? 'Nu am putut încărca călătoriile. Încearcă din nou.' : null)
    const rows = (data || []) as Trip[]
    setTrips(rows)

    if (rows.length > 0) {
      const [profiles, stops] = await Promise.all([
        fetchProfilesMap(supabase, rows.map(t => t.author_id)),
        supabase.from('trip_locations').select('trip_id').in('trip_id', rows.map(t => t.id)),
      ])
      setAuthors(profiles)

      const counts: Record<string, number> = {}
      for (const row of (stops.data || []) as { trip_id: string }[]) {
        counts[row.trip_id] = (counts[row.trip_id] || 0) + 1
      }
      setStopCounts(counts)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(sort, query), 300)
    return () => clearTimeout(timer)
  }, [sort, query, load])

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-3.5 pb-3 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Route size={18} className="text-[#E8440A]" />
            <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Călătorii</span>
            <Link
              href="/trip/new"
              className="ml-auto bg-[#E8440A] text-white font-outfit text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Plus size={13} /> Adaugă
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    'text-[12px] px-3 py-1.5 rounded-full font-outfit font-medium border whitespace-nowrap',
                    sort === s.id
                      ? 'bg-[#E8440A] text-white border-[#E8440A]'
                      : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1.5">
              <Search size={13} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Caută o călătorie..."
                className="flex-1 min-w-0 bg-transparent text-[12px] outline-none placeholder:text-[#9B9B9B]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 pt-4">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-3">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#E8440A]" />
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">🧭</div>
            <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1">
              {query.trim() ? 'Niciun rezultat' : 'Nicio călătorie încă'}
            </p>
            <p className="text-[13px] text-[#9B9B9B] mb-4">
              {query.trim() ? 'Încearcă alt termen.' : 'Fii primul care împarte un itinerar cu comunitatea.'}
            </p>
            {!query.trim() && (
              <Link href="/trip/new" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
                + Creează o călătorie
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trips.map(trip => {
              const author = authors[trip.author_id]
              const transport = TRANSPORT_TYPES.find(t => t.id === trip.transport_type)
              const stops = stopCounts[trip.id] || 0

              return (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden block hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="h-36 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] relative overflow-hidden">
                    {trip.cover_image
                      ? <CoverImage src={trip.cover_image} />
                      : <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🧭</div>}
                    {(trip.save_count || 0) > 0 && (
                      <span className="absolute top-2.5 right-2.5 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Bookmark size={9} /> {formatCount(trip.save_count || 0)}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight mb-1.5">{trip.title}</h3>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {trip.duration_days && (
                        <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Calendar size={10} /> {trip.duration_days} zile
                        </span>
                      )}
                      {stops > 0 && (
                        <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2 py-0.5 flex items-center gap-1">
                          <MapPin size={10} /> {stops} opriri
                        </span>
                      )}
                      {transport && (
                        <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2 py-0.5">
                          {transport.emoji} {transport.label}
                        </span>
                      )}
                      {trip.countries && trip.countries.length > 0 && (
                        <span className="text-[11px] text-[#5B4FCF] bg-[#EEEDFB] rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Globe size={10} /> {trip.countries.join(', ')}
                        </span>
                      )}
                    </div>

                    {trip.description && (
                      <p className="text-[13px] text-[#6B6B6B] leading-relaxed line-clamp-2 mb-2">{trip.description}</p>
                    )}

                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: colorFor(trip.author_id) }}
                      >
                        {initialsOf(author?.full_name || author?.username)}
                      </div>
                      <span className="text-[12px] text-[#6B6B6B] truncate">
                        {author?.full_name || author?.username || 'Călător'}
                      </span>
                      <span className="text-[11px] text-[#9B9B9B] ml-auto flex-shrink-0">{timeAgo(trip.created_at)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
