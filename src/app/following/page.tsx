'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Users } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import EmptyState from '@/components/ui/EmptyState'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import FeedCard, { toFeedCardItem } from '@/components/feed/FeedCard'
import { createClient } from '@/lib/supabase-client'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import {
  fetchFollowingFeed,
  fetchFollowingIds,
  fetchSuggestedUsers,
  type FeedItem,
  type SuggestedUser,
} from '@/lib/follows'

const PAGE_SIZE = 10

/** Voturile mele pe experiențele din pagină; călătoriile nu se votează. */
const loadVotes = (
  supabase: ReturnType<typeof createClient>,
  feed: FeedItem[],
) => fetchMyVotes(supabase, feed.filter(item => item.kind === 'experience').map(item => item.id))

export default function FollowingPage() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setLoggedIn(!!user)

      const ids = user ? await fetchFollowingIds(supabase, user.id) : []
      setFollowingIds(ids)

      const feed = ids.length > 0
        ? await fetchFollowingFeed(supabase, ids, { limit: PAGE_SIZE })
        : []
      setItems(feed)
      setHasMore(feed.length === PAGE_SIZE)
      if (feed.length > 0) setMyVotes(await loadVotes(supabase, feed))

      if (feed.length === 0) {
        setSuggestions(await fetchSuggestedUsers(supabase, [...ids, user?.id || ''], 6))
      }
      setLoading(false)
    }
    load()
  }, [])

  const loadMore = useCallback(async () => {
    const last = items[items.length - 1]
    if (!last || loadingMore) return

    setLoadingMore(true)
    const supabase = createClient()
    // cursor pe created_at — aceeași margine pentru ambele tabele
    const next = await fetchFollowingFeed(supabase, followingIds, {
      before: last.created_at,
      limit: PAGE_SIZE,
    })

    setItems(prev => [...prev, ...next])
    setHasMore(next.length === PAGE_SIZE)
    if (next.length > 0) {
      const votes = await loadVotes(supabase, next)
      setMyVotes(prev => ({ ...prev, ...votes }))
    }
    setLoadingMore(false)
  }, [items, followingIds, loadingMore])

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[780px] mx-auto flex items-center gap-2">
          <Users size={18} className="text-[#E8440A]" />
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Urmăresc</span>
          {followingIds.length > 0 && (
            <span className="text-[12px] text-[#9B9B9B]">· {followingIds.length} urmăriți</span>
          )}
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-5 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#E8440A]" />
          </div>
        ) : items.length === 0 ? (
          <div>
            <div className="mb-5">
              <EmptyState
                illustration="people"
                title={loggedIn ? 'Feedul tău e gol deocamdată' : 'Intră în cont ca să-ți urmărești călătorii'}
                description={loggedIn
                  ? 'Urmărește câțiva călători și aici o să apară locurile pe care le descoperă ei — înaintea tuturor.'
                  : 'Feedul „Urmăresc" adună postările oamenilor pe care îi urmărești, într-un singur loc.'}
                action={loggedIn ? undefined : { href: '/login', label: 'Intră în cont' }}
              />
            </div>
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">Sugestii pentru tine</h2>
            <UserSuggestionList users={suggestions} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <FeedCard
                  key={`${item.kind}-${item.id}`}
                  variant="following"
                  myVote={myVotes[item.id] ?? null}
                  item={toFeedCardItem(item)}
                />
              ))}
            </div>

            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[13px] font-medium rounded-full py-3 mt-4 flex items-center justify-center gap-2 hover:bg-[#F8F7F5] transition-colors disabled:opacity-60"
              >
                {loadingMore ? <><Loader2 size={15} className="animate-spin" /> Se încarcă...</> : 'Încarcă mai multe'}
              </button>
            ) : (
              <p className="text-center text-[12px] text-[#9B9B9B] py-5">Ai ajuns la capăt.</p>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
