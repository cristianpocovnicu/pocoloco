'use client'
import { useCallback, useEffect, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import { Bookmark, Calendar, Globe, Loader2, MapPin, Plus, Route, Search } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import NotificationBell from '@/components/layout/NotificationBell'
import EmptyState from '@/components/ui/EmptyState'
import TripKindBadge from '@/components/trip/TripKindBadge'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, colorFor, initialsOf, type MiniProfile } from '@/lib/profiles'
import { cn, formatCount, timeAgo, tripTransports } from '@/lib/utils'
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

    // search_trips (migrarea 37) ignoră diacriticele: „bacau" găsește
    // „Bacău". Titlul rămâne singura coloană căutată.
    const { data, error: loadError } = await supabase.rpc('search_trips', {
      p_term: q.trim(),
      p_sort: sortKey,
      p_limit: PAGE_SIZE,
    })
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

  /** Cardul unei călătorii — același, în ambele secțiuni. */
  const renderTrip = (trip: Trip) => {
    const author = authors[trip.author_id]
    const transports = tripTransports(trip)
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
          <TripKindBadge isGuide={trip.is_guide} onCover className="absolute top-2.5 left-2.5" />
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
            {transports.length > 0 && (
              <span
                title={transports.map(t => t.label).join(', ')}
                className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2 py-0.5"
              >
                {/* pe card e loc de o etichetă doar când e un singur mijloc */}
                {transports.map(t => t.emoji).join(' ')}
                {transports.length === 1 && ` ${transports[0].label}`}
              </span>
            )}
            {trip.countries && trip.countries.length > 0 && (
              <span className="text-[11px] text-[#5B4FCF] bg-[#EEEDFB] rounded-full px-2 py-0.5 flex items-center gap-1">
                <Globe size={10} /> {trip.countries.join(', ')}
              </span>
            )}
          </div>

          {trip.description && (
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed line-clamp-2 mb-2 whitespace-pre-line">{trip.description}</p>
          )}

          <div className="flex items-center gap-1.5">
            <Avatar id={trip.author_id} name={author?.full_name || author?.username} src={author?.avatar_url} size={20} />
            <span className="text-[12px] text-[#6B6B6B] truncate">
              {author?.full_name || author?.username || 'Călător'}
            </span>
            <span className="text-[11px] text-[#9B9B9B] ml-auto flex-shrink-0">{timeAgo(trip.created_at)}</span>
          </div>
        </div>
      </Link>
    )
  }

  // ghidurile editoriale stau sus, restul dedesubt — o singură listă,
  // fără taburi de ales
  const verified = trips.filter(t => t.is_guide)
  const rest = trips.filter(t => !t.is_guide)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-3.5 pb-3 sticky top-0 z-30">
        <div className="max-w-[780px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            {/* iconița spune ce entitate e pagina, deci poartă violetul
                călătoriei; butonul de adăugat rămâne portocaliul de brand */}
            <Route size={18} className="text-[#5B4FCF]" />
            <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Călătorii</span>
            <Link
              href="/add-experience"
              className="ml-auto bg-[#E8440A] text-white font-outfit text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Plus size={13} /> Adaugă
            </Link>
            <NotificationBell />
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

      <div className="max-w-[780px] mx-auto px-5 pt-4">
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
          <EmptyState
            illustration="compass"
            title={query.trim() ? 'Niciun rezultat' : 'Nicio călătorie încă'}
            description={query.trim()
              ? 'Încearcă alt termen sau schimbă sortarea.'
              : 'Un itinerar bun le economisește altora zile de căutat. Pune-l pe al tău: locurile, pe zile, cu notițe.'}
            action={query.trim() ? undefined : { href: '/add-experience', label: '+ Povestește prima călătorie' }}
          />
        ) : (
          <>
          {verified.length > 0 && (
            <>
              <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-2.5 flex items-center gap-1.5">
                <span className="text-[#5B4FCF]">✓</span> Verificate de Pocoloco
              </h2>
              <div className="flex flex-col gap-3 mb-6">
                {verified.map(renderTrip)}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3">
            {rest.map(renderTrip)}
          </div>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
