'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ExperienceCardSkeleton } from '@/components/ui/Skeleton'
import { createClient } from '@/lib/supabase-client'
import FeedCard from '@/components/feed/FeedCard'
import { useFeedScope } from '@/components/feed/FeedScope'
import { fetchMyVotes, netScore, HIDE_THRESHOLD_EXPERIENCE, type VoteType } from '@/lib/votes'
import HiddenByVotes from '@/components/experience/HiddenByVotes'

type Post = {
  id: string
  kind?: 'place_visit' | 'activity'
  title?: string | null
  activity_category?: string | null
  activity_area?: string | null
  content: string
  images: string[]
  rating_experience: number
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author: {
    full_name: string
    is_guide: boolean
  }
  location: {
    id: string
    name: string
    city: string
    status: string
  } | null
}

const PAGE_SIZE = 10

type Sort = 'popular' | 'recent'

export default function PopularSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  const [sort, setSort] = useState<Sort>('popular')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [revealed, setRevealed] = useState<string[]>([])
  const sentinel = useRef<HTMLDivElement>(null)
  const { shown } = useFeedScope()

  /**
   * Ce a apărut deja în „Urmăresc" nu se mai repetă aici. Excluderea se
   * face pe client: cererile pleacă în paralel, iar id-urile de sus se
   * știu abia după ce răspunde secțiunea lor.
   */
  const visible = shown ? posts.filter(post => !shown.has(post.id)) : []

  /**
   * „Recente" folosește cursor pe created_at, ca postările noi să nu
   * decaleze paginile. „Populare" sortează după net_score, coloană
   * generată în DB, unde un cursor n-ar avea sens — acolo paginăm cu range.
   */
  const loadPage = useCallback(async (sortKey: Sort, offset: number, before?: string) => {
    const supabase = createClient()
    // !inner + filtrul pe location.status => experiențele din locații
    // neaprobate (pending/rejected) nu apar deloc în feed
    let request = supabase
      .from('experiences')
      .select(`
        id, kind, title, activity_category, activity_area,
        content, images, rating_experience,
        upvotes, downvotes, comment_count, created_at,
        author:profiles!author_id(full_name, is_guide),
        location:locations!location_id(id, name, city, status)
      `)
      .eq('status', 'active')

    if (sortKey === 'popular') {
      request = request
        .order('net_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    } else {
      request = request.order('created_at', { ascending: false }).limit(PAGE_SIZE)
      if (before) request = request.lt('created_at', before)
    }

    const { data, error } = await request
    if (error || !data) return { list: [] as Post[], done: true }

    // join stâng, ca activitățile (fără locație) să rămână în listă;
    // experiențele legate de un loc neaprobat le scoatem aici
    const list = (data as unknown as Post[]).filter(
      post => post.kind === 'activity' || post.location?.status === 'approved'
    )
    const votes = await fetchMyVotes(supabase, list.map(p => p.id))
    setMyVotes(prev => ({ ...prev, ...votes }))

    return { list, done: list.length < PAGE_SIZE }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { list, done } = await loadPage(sort, 0)
      setPosts(list)
      setHasMore(!done)
      setLoading(false)
    }
    load()
  }, [loadPage, sort])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return
    setLoadingMore(true)

    const { list, done } = await loadPage(sort, posts.length, posts[posts.length - 1].created_at)
    setPosts(prev => [...prev, ...list])
    setHasMore(!done)
    setLoadingMore(false)
  }, [loadPage, loadingMore, hasMore, posts, sort])

  // încarcă următoarea pagină când santinela intră în ecran
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '300px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  // schelet cu aceeași siluetă ca postările, ca pagina să nu sară la încărcare
  if (loading || !shown) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Din comunitate</h2>
      <div className="flex flex-col gap-3">
        <ExperienceCardSkeleton />
        <ExperienceCardSkeleton />
        <ExperienceCardSkeleton />
      </div>
    </section>
  )

  // tot ce era aici a apărut deja mai sus: secțiunea n-are ce spune
  if (posts.length > 0 && visible.length === 0) return null

  if (posts.length === 0) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🌍</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1">Nicio experiență încă</p>
      <p className="text-[13px] text-[#9B9B9B] mb-4">Fii primul care adaugă o experiență!</p>
      <Link href="/add-experience" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
        + Adaugă experiență
      </Link>
    </div>
  )

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Din comunitate</h2>
        <div className="flex bg-white border border-[rgba(0,0,0,0.08)] rounded-full p-0.5 flex-shrink-0">
          {([
            { id: 'popular' as const, label: 'Populare' },
            { id: 'recent' as const, label: 'Recente' },
          ]).map(option => (
            <button
              key={option.id}
              onClick={() => setSort(option.id)}
              className={`px-3 py-1 rounded-full text-[12px] font-outfit font-medium transition-colors ${
                sort === option.id ? 'bg-[#0F0F0F] text-white' : 'text-[#6B6B6B]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {visible.map(post => {
          if (netScore(post.upvotes, post.downvotes) <= HIDE_THRESHOLD_EXPERIENCE && !revealed.includes(post.id)) {
            return (
              <HiddenByVotes
                key={post.id}
                kind="experience"
                onShow={() => setRevealed(prev => [...prev, post.id])}
              />
            )
          }

          return (
            <FeedCard
              key={post.id}
              item={{
                id: post.id,
                kind: 'experience',
                href: post.location ? `/location/${post.location.id}` : `/experience/${post.id}`,
                createdAt: post.created_at,
                author: { full_name: post.author?.full_name, is_guide: post.author?.is_guide },
                isActivity: post.kind === 'activity',
                activityCategory: post.activity_category,
                place: post.kind === 'activity'
                  ? post.activity_area || null
                  : `${post.location?.name}${post.location?.city ? `, ${post.location.city}` : ''}`,
                title: post.kind === 'activity' ? post.title : null,
                text: post.content,
                images: post.images || [],
                upvotes: post.upvotes,
                downvotes: post.downvotes,
                commentCount: post.comment_count,
              }}
              myVote={myVotes[post.id] ?? null}
            />
          )
        })}
      </div>

      {/* santinela pentru infinite scroll */}
      {hasMore && <div ref={sentinel} className="h-1" />}

      {loadingMore && (
        <div className="flex flex-col gap-3 mt-3">
          <ExperienceCardSkeleton />
          <ExperienceCardSkeleton />
        </div>
      )}

      {!hasMore && posts.length >= PAGE_SIZE && (
        <p className="text-center text-[12px] text-[#9B9B9B] py-6">Ai ajuns la capăt.</p>
      )}
    </section>
  )
}
