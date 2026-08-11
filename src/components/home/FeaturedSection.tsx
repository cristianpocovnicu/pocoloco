'use client'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bookmark, ChevronLeft, ChevronRight, Loader2, MapPin, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, colorFor, initialsOf, type MiniProfile } from '@/lib/profiles'
import { formatCount } from '@/lib/utils'
import TripKindBadge from '@/components/trip/TripKindBadge'
import CoverImage from '@/components/ui/CoverImage'

type FeaturedCard = {
  id: string
  kind: 'trip' | 'location' | 'experience'
  title: string
  subtitle: string
  cover: string | null
  metric: number
  author: MiniProfile | null
  href: string
  isGuide?: boolean | null
  /** pentru sortare: promovatele se ordonează cronologic între ele */
  createdAt?: string
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
  is_guide?: boolean | null
  created_at?: string
}

type LocationRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  cover_image: string | null
  experience_count: number | null
  created_at: string
}

type ExperienceRow = {
  id: string
  kind?: string | null
  title?: string | null
  activity_area?: string | null
  content: string | null
  images: string[] | null
  upvotes: number | null
  author_id: string
  location: { id: string; name: string; city: string | null; status?: string } | null
}

const PLACEHOLDER: Record<FeaturedCard['kind'], string> = {
  trip: '🧭',
  location: '📍',
  experience: '📍',
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

      /**
       * Ce a ales adminul: călătorii și locații promovate, la un loc.
       * Locațiile au coloana din migrarea 40 — până e rulată, cererea lor
       * dă eroare și rămân doar călătoriile.
       */
      const [featuredTrips, featuredLocations] = await Promise.all([
        supabase
          .from('trips')
          .select('id, title, cover_image, countries, duration_days, save_count, author_id, is_guide, created_at')
          .eq('status', 'active')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('locations')
          .select('id, name, city, country, cover_image, experience_count, created_at')
          .eq('status', 'approved')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      const tripRows = (featuredTrips.data || []) as TripRow[]
      const locationRows = (featuredLocations.error ? [] : featuredLocations.data || []) as LocationRow[]

      if (tripRows.length > 0 || locationRows.length > 0) {
        const authors = await fetchProfilesMap(supabase, tripRows.map(t => t.author_id))
        const mixed: FeaturedCard[] = [
          ...tripRows.map(t => ({
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
            isGuide: t.is_guide,
            createdAt: t.created_at,
          })),
          ...locationRows.map(l => ({
            id: l.id,
            kind: 'location' as const,
            title: l.name,
            subtitle: l.city || l.country || 'Loc',
            cover: l.cover_image,
            metric: l.experience_count || 0,
            // un loc n-are autor: e al tuturor celor care scriu despre el
            author: null,
            href: `/location/${l.id}`,
            createdAt: l.created_at,
          })),
        ]

        // ghidurile rămân primele, ca până acum; restul, cele mai noi întâi
        mixed.sort((a, b) => {
          if (!!a.isGuide !== !!b.isGuide) return a.isGuide ? -1 : 1
          return (b.createdAt || '').localeCompare(a.createdAt || '')
        })

        setCards(mixed.slice(0, 8))
        setLoading(false)
        return
      }

      // Nimic promovat încă: secțiunea rămâne plină cu ce e mai salvat,
      // ca înainte de promovare — un homepage gol e mai rău decât unul
      // necurat.
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title, cover_image, countries, duration_days, save_count, author_id, is_guide')
        .eq('status', 'active')
        .order('is_guide', { ascending: false })
        .order('save_count', { ascending: false })
        .limit(6)

      const fallbackTrips = (trips || []) as TripRow[]

      if (fallbackTrips.length > 0) {
        const authors = await fetchProfilesMap(supabase, fallbackTrips.map(t => t.author_id))
        setCards(fallbackTrips.map(t => ({
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
          isGuide: t.is_guide,
        })))
        setLoading(false)
        return
      }

      // fără călătorii încă => cele mai apreciate experiențe
      const { data: experiences } = await supabase
        .from('experiences')
        .select('id, kind, title, activity_area, content, images, upvotes, author_id, location:locations!location_id(id, name, city, status)')
        .eq('status', 'active')
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)

      const experienceRows = ((experiences || []) as unknown as ExperienceRow[])
        .filter(e => e.kind === 'activity' || e.location?.status === 'approved')
      const authors = await fetchProfilesMap(supabase, experienceRows.map(e => e.author_id))

      setCards(experienceRows.map(e => ({
        id: e.id,
        kind: 'experience' as const,
        title: e.kind === 'activity'
          ? (e.title || 'Activitate')
          : (e.content?.slice(0, 90) || 'Experiență'),
        subtitle: e.location
          ? `${e.location.name}${e.location.city ? `, ${e.location.city}` : ''}`
          : (e.activity_area || 'Activitate'),
        cover: e.images?.[0] || null,
        metric: e.upvotes || 0,
        author: authors[e.author_id] || null,
        href: e.location ? `/location/${e.location.id}` : `/experience/${e.id}`,
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
              <CoverImage src={card.cover} sizes="(max-width: 768px) 240px, 33vw" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-5xl opacity-40`}>
                {PLACEHOLDER[card.kind]}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            {card.kind === 'trip' ? (
              <TripKindBadge isGuide={card.isGuide} onCover className="absolute top-2.5 left-2.5" />
            ) : card.kind === 'location' ? (
              /* locul și experiența sunt aceeași familie: aceeași culoare,
                 iconițe diferite. Negrul de dinainte îl scotea pe „Loc" din
                 sistem cu totul. */
              <span className="absolute top-2.5 left-2.5 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <MapPin size={9} /> Loc
              </span>
            ) : (
              <span className="absolute top-2.5 left-2.5 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <PenLine size={9} /> Experiența
              </span>
            )}
            {card.metric > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                {card.kind === 'trip'
                  ? <Bookmark size={9} />
                  : card.kind === 'location' ? <PenLine size={9} /> : <ArrowUp size={9} />}
                {formatCount(card.metric)}
              </span>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-outfit text-[13px] font-semibold text-white leading-tight mb-1.5 line-clamp-2">{card.title}</p>
              <div className="flex items-center gap-1.5">
                {/* locul n-are autor — atunci rândul de jos e doar despre el */}
                {card.author && (
                  <>
                    <Avatar id={card.author.id} name={card.author.full_name || card.author.username} src={card.author.avatar_url} size={20} />
                    <span className="text-[11px] text-white/85 truncate">
                      {card.author.full_name || card.author.username || 'Călător'}
                    </span>
                  </>
                )}
                <span className="text-[11px] text-white/60 truncate">
                  {card.author ? '· ' : ''}{card.subtitle}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
