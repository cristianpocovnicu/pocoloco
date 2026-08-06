'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, Star, EyeOff, RotateCcw, Trash2, MapPin, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, statusStyle, type MiniProfile } from '@/lib/admin'
import { cn, timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'
import CoverImage from '@/components/ui/CoverImage'

type TripRow = {
  id: string
  title: string
  author_id: string
  duration_days: number | null
  countries: string[] | null
  cover_image: string | null
  save_count: number | null
  featured: boolean | null
  status: string
  created_at: string
}

type Filter = 'all' | 'featured' | 'hidden'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'featured', label: 'Promovate' },
  { id: 'hidden', label: 'Ascunse' },
]

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('trips')
      .select('id, title, author_id, duration_days, countries, cover_image, save_count, featured, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as TripRow[]
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

    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const patchTrip = async (id: string, patch: Partial<TripRow>) => {
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('trips').update(patch).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setTrips(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
      setError(null)
    }
    setBusyId(null)
  }

  const remove = async (trip: TripRow) => {
    if (!window.confirm(`Ștergi definitiv „${trip.title}"? Itinerarul dispare odată cu ea.`)) return
    setBusyId(trip.id)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('trips').delete().eq('id', trip.id)
    if (deleteError) setError(deleteError.message)
    else {
      setTrips(prev => prev.filter(t => t.id !== trip.id))
      setError(null)
    }
    setBusyId(null)
  }

  const q = query.trim().toLowerCase()
  const visible = trips.filter(t => {
    if (filter === 'featured' && !t.featured) return false
    if (filter === 'hidden' && t.status !== 'removed') return false
    if (!q) return true
    return t.title.toLowerCase().includes(q)
  })

  const counts = {
    all: trips.length,
    featured: trips.filter(t => t.featured).length,
    hidden: trips.filter(t => t.status === 'removed').length,
  }

  return (
    <div>
      <AdminHeader title="Călătorii" subtitle={`${trips.length} călătorii, ${counts.featured} promovate`} />

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
              className="flex-1 min-w-0 bg-transparent text-[12px] outline-none placeholder:text-[#9B9B9B]"
              placeholder="Caută după titlu..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#E8440A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] py-16 text-center">
            <p className="text-[13px] text-[#9B9B9B]">Nicio călătorie în această categorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map(trip => {
              const author = authors[trip.author_id]
              const style = statusStyle(trip.status)
              const busy = busyId === trip.id
              const stops = stopCounts[trip.id] || 0

              return (
                <div key={trip.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative w-14 h-14 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {trip.cover_image
                      ? <CoverImage src={trip.cover_image} sizes="56px" />
                      : <span className="text-xl opacity-50">🧭</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Link href={`/trip/${trip.id}`} className="font-outfit text-[14px] font-semibold text-[#0F0F0F] hover:text-[#E8440A] truncate">
                        {trip.title}
                      </Link>
                      {trip.featured && (
                        <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center gap-0.5">
                          <Star size={9} className="fill-[#D97706]" /> PROMOVATĂ
                        </span>
                      )}
                      <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${style.className}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6B6B6B] truncate">
                      {author ? `@${author.username || author.full_name}` : 'Autor necunoscut'}
                      {trip.countries?.length ? ` · ${trip.countries.join(', ')}` : ''}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5"><MapPin size={10} /> {stops} opriri</span>
                      {trip.duration_days && <span className="flex items-center gap-0.5"><Calendar size={10} /> {trip.duration_days} zile</span>}
                      <span>· {trip.save_count || 0} salvări</span>
                      <span>· {timeAgo(trip.created_at)}</span>
                    </p>
                  </div>

                  <div className="flex gap-1.5 flex-wrap md:justify-end flex-shrink-0">
                    <button
                      disabled={busy}
                      onClick={() => patchTrip(trip.id, { featured: !trip.featured })}
                      className={cn(
                        'text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50',
                        trip.featured
                          ? 'bg-[#FFFBEB] text-[#D97706]'
                          : 'bg-[#F8F7F5] text-[#6B6B6B]'
                      )}
                    >
                      <Star size={12} className={trip.featured ? 'fill-[#D97706]' : ''} />
                      {trip.featured ? 'Scoate' : 'Promovează'}
                    </button>

                    {trip.status === 'removed' ? (
                      <button
                        disabled={busy}
                        onClick={() => patchTrip(trip.id, { status: 'active' })}
                        className="text-[11px] bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw size={12} /> Restaurează
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => patchTrip(trip.id, { status: 'removed' })}
                        className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <EyeOff size={12} /> Ascunde
                      </button>
                    )}

                    <button
                      disabled={busy}
                      onClick={() => remove(trip)}
                      className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
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
