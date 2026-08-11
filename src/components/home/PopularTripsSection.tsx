'use client'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { useEffect, useState } from 'react'
import { Bookmark, Calendar, Globe, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatCount } from '@/lib/utils'
import { fetchProfilesMap, colorFor, initialsOf, type MiniProfile } from '@/lib/profiles'
import TripKindBadge from '@/components/trip/TripKindBadge'
import CoverImage from '@/components/ui/CoverImage'
import type { Trip } from '@/lib/trips'

/** Sub cât nu merită secțiune: un singur card arată ca o greșeală. */
const MIN_CARDS = 2
const MAX_CARDS = 6

export default function PopularTripsSection() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      /*
       * Popularitatea unei călătorii înseamnă azi salvările: `save_count`
       * e singurul contor pe care îl ține un trigger. Voturile nu ajung
       * până aici (`votes` n-are `trip_id`), deci n-avem `net_score` ca
       * la experiențe. La egalitate — și zero salvări e egalitate —
       * decide data.
       */
      const { data } = await supabase
        .from('trips')
        .select('id, author_id, title, description, duration_days, countries, cover_image, save_count, is_guide, status, created_at')
        .eq('status', 'active')
        .order('save_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(MAX_CARDS)

      const rows = (data || []) as Trip[]
      setTrips(rows)
      if (rows.length > 0) setAuthors(await fetchProfilesMap(supabase, rows.map(t => t.author_id)))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Călătorii populare</h2>
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  if (trips.length < MIN_CARDS) return null

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Călătorii populare</h2>
        <Link href="/trips" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      {/* aceeași grilă și același card ca pe /trips, la scara homepage-ului */}
      <div className="grid grid-cols-2 gap-2.5">
        {trips.map(trip => {
          const author = authors[trip.author_id]

          return (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden block hover:border-[rgba(0,0,0,0.15)] transition-colors"
            >
              <div className="h-24 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] relative overflow-hidden">
                {trip.cover_image
                  ? <CoverImage src={trip.cover_image} sizes="(max-width: 768px) 50vw, 340px" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">🧭</div>}
                <TripKindBadge isGuide={trip.is_guide} onCover className="absolute top-2 left-2" />
                {(trip.save_count || 0) > 0 && (
                  <span className="absolute top-2 right-2 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Bookmark size={9} /> {formatCount(trip.save_count || 0)}
                  </span>
                )}
              </div>

              <div className="p-2.5">
                <h3 className="font-outfit text-[13px] font-semibold text-[#0F0F0F] leading-tight line-clamp-2 mb-1">
                  {trip.title}
                </h3>
                <p className="text-[11px] text-[#6B6B6B] flex items-center gap-1.5 truncate">
                  {trip.countries?.length
                    ? <><Globe size={10} className="flex-shrink-0" /> <span className="truncate">{trip.countries.join(', ')}</span></>
                    : trip.duration_days
                      ? <><Calendar size={10} className="flex-shrink-0" /> {trip.duration_days} zile</>
                      : <span className="text-[#9B9B9B]">Călătorie</span>}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Avatar id={trip.author_id} name={author?.full_name || author?.username} src={author?.avatar_url} size={16} />
                  <span className="text-[11px] text-[#9B9B9B] truncate">
                    {author?.full_name || author?.username || 'Călător'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
