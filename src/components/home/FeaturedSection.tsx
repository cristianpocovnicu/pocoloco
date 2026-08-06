'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Bookmark, ArrowUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, colorFor, initialsOf, type MiniProfile } from '@/lib/profiles'
import { formatCount } from '@/lib/utils'

type FeaturedCard = {
  id: string
  kind: 'trip' | 'experience'
  title: string
  subtitle: string
  cover: string | null
  metric: number
  author: MiniProfile | null
  href: string
}

const GRADIENTS = [
  'from-purple-700 to-blue-600',
  'from-amber-500 to-red-500',
  'from-emerald-500 to-sky-500',
  'from-emerald-700 to-teal-500',
  'from-orange-500 to-yellow-600',
  'from-pink-400 to-rose-600',
]

type TripRow = {
  id: string
  title: string
  cover_image: string | null
  countries: string[] | null
  duration_days: number | null
  save_count: number | null
  author_id: string
}

type ExperienceRow = {
  id: string
  content: string | null
  images: string[] | null
  upvotes: number | null
  author_id: string
  location: { id: string; name: string; city: string | null } | null
}

export default function FeaturedSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [cards, setCards] = useState<FeaturedCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      // întâi călătoriile cele mai salvate
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title, cover_image, countries, duration_days, save_count, author_id')
        .eq('status', 'active')
        .order('save_count', { ascending: false })
        .limit(6)

      const tripRows = (trips || []) as TripRow[]

      if (tripRows.length > 0) {
        const authors = await fetchProfilesMap(supabase, tripRows.map(t => t.author_id))
        setCards(tripRows.map(t => ({
          id: t.id,
          kind: 'trip' as const,
          title: t.title,
          subtitle: t.countries?.length
            ? t.countries.join(', ')
            : t.duration_days ? `${t.duration_days} zile` : 'Călătorie',
          cover: t.cover_image,
          metric: t.save_count || 0,
          author: authors[t.author_id] || null,
          href: `/trip/${t.id}`,
        })))
        setLoading(false)
        return
      }

      // fără călătorii încă => cele mai apreciate experiențe
      const { data: experiences } = await supabase
        .from('experiences')
        .select('id, content, images, upvotes, author_id, location:locations!location_id!inner(id, name, city, status)')
        .eq('status', 'active')
        .eq('location.status', 'approved')
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)

      const experienceRows = (experiences || []) as unknown as ExperienceRow[]
      const authors = await fetchProfilesMap(supabase, experienceRows.map(e => e.author_id))

      setCards(experienceRows.map(e => ({
        id: e.id,
        kind: 'experience' as const,
        title: e.content?.slice(0, 90) || 'Experiență',
        subtitle: e.location ? `${e.location.name}${e.location.city ? `, ${e.location.city}` : ''}` : 'Experiență',
        cover: e.images?.[0] || null,
        metric: e.upvotes || 0,
        author: authors[e.author_id] || null,
        href: e.location ? `/location/${e.location.id}` : '#',
      })))
      setLoading(false)
    }
    load()
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.offsetWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Recomandate</h2>
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  if (cards.length === 0) return null

  const showingTrips = cards[0].kind === 'trip'

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Recomandate</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30 hover:bg-[#F8F7F5] transition-colors"
            >
              <ChevronLeft size={16} className="text-[#6B6B6B]" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30 hover:bg-[#F8F7F5] transition-colors"
            >
              <ChevronRight size={16} className="text-[#6B6B6B]" />
            </button>
          </div>
          <Link href={showingTrips ? '/trips' : '/search'} className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="flex gap-3 overflow-x-auto scrollbar-hide">
        {cards.map((card, i) => (
          <Link
            key={`${card.kind}-${card.id}`}
            href={card.href}
            className="min-w-[240px] md:min-w-[calc(33%-8px)] h-[150px] md:h-[160px] rounded-2xl overflow-hidden relative flex-shrink-0 block"
          >
            {card.cover ? (
              <img src={card.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-5xl opacity-40`}>
                {card.kind === 'trip' ? '🧭' : '📍'}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            <span className="absolute top-2.5 left-2.5 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
              {card.kind === 'trip' ? 'Calatorie' : 'Experienta'}
            </span>
            {card.metric > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                {card.kind === 'trip' ? <Bookmark size={9} /> : <ArrowUp size={9} />} {formatCount(card.metric)}
              </span>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-outfit text-[13px] font-semibold text-white leading-tight mb-1.5 line-clamp-2">{card.title}</p>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: colorFor(card.author?.id || card.id) }}
                >
                  {initialsOf(card.author?.full_name || card.author?.username)}
                </div>
                <span className="text-[11px] text-white/85 truncate">
                  {card.author?.full_name || card.author?.username || 'Călător'}
                </span>
                <span className="text-[11px] text-white/60 truncate">· {card.subtitle}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
