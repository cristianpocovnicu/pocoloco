'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import {
  fetchFollowingFeed,
  fetchFollowingIds,
  fetchSuggestedUsers,
  type FeedItem,
  type SuggestedUser,
} from '@/lib/follows'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import TripKindBadge from '@/components/trip/TripKindBadge'
import CoverImage from '@/components/ui/CoverImage'
import { activityLabel } from '@/lib/activities'

export default function FollowingSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const [items, setItems] = useState<FeedItem[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  /** secțiunea e despre cine urmărești — pentru un vizitator n-are subiect */
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setLoggedIn(!!user)
      if (!user) { setLoading(false); return }

      const followingIds = await fetchFollowingIds(supabase, user.id)
      const feed = followingIds.length > 0
        ? await fetchFollowingFeed(supabase, followingIds, { limit: 8 })
        : []

      setItems(feed)
      // fără postări de la cei urmăriți => propunem pe cine să urmărească
      if (feed.length === 0) {
        setSuggestions(await fetchSuggestedUsers(supabase, [...followingIds, user?.id || ''], 4))
      }
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

  if (!loggedIn && !loading) return null

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Urmăresc</h2>
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  // Nimeni urmărit (sau fără postări) — sugestii
  if (items.length === 0) return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Urmăresc</h2>
        <Link href="/following" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>
      <p className="text-[13px] text-[#9B9B9B] mb-3">
        Urmărește călători ca să vezi aici ce postează.
      </p>
      <UserSuggestionList users={suggestions} />
    </section>
  )

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Urmăresc</h2>
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
          <Link href="/following" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
      >
        {items.map(item => {
          const cover = item.images[0]
          const subtitle = item.kind === 'trip'
            ? (item.countries?.join(', ') || 'Călătorie')
            : item.activityTitle
              ? (item.activityArea || activityLabel(item.activityCategory) || 'Activitate')
              : `${item.location?.name}${item.location?.city ? `, ${item.location.city}` : ''}`

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className="min-w-[220px] md:min-w-[calc(33%-8px)] bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex-shrink-0 block hover:border-[rgba(0,0,0,0.15)] transition-colors"
            >
              <div className="h-[110px] bg-[#F8F7F5] flex items-center justify-center text-4xl relative overflow-hidden">
                {cover
                  ? <CoverImage src={cover} sizes="(max-width: 768px) 220px, 33vw" />
                  : <span>{item.kind === 'trip' ? '🧭' : '📍'}</span>}
                {item.kind === 'trip' ? (
                  <TripKindBadge isGuide={item.isGuide} onCover className="absolute top-2 left-2" />
                ) : item.activityTitle ? (
                  <span className="absolute top-2 left-2 bg-[#5B4FCF] text-white text-[10px] font-outfit font-bold uppercase px-2 py-0.5 rounded-full">
                    {activityLabel(item.activityCategory) || 'Activitate'}
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase px-2 py-0.5 rounded-full">
                    Experiența
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: colorFor(item.author?.id || item.id) }}
                  >
                    {initialsOf(item.author?.full_name || item.author?.username)}
                  </div>
                  <span className="text-[12px] text-[#6B6B6B] font-medium truncate">
                    {item.author?.full_name || item.author?.username || 'User'}
                  </span>
                </div>
                <p className="text-[13px] font-outfit font-semibold text-[#0F0F0F] leading-tight mb-1 line-clamp-2 whitespace-pre-line">
                  {item.kind === 'trip' ? item.title : (item.activityTitle || item.text)}
                </p>
                <p className="text-[11px] text-[#9B9B9B] truncate">📍 {subtitle}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
