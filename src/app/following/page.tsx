'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, Route, Users } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import UserSuggestionList from '@/components/profile/UserSuggestionList'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { timeAgo } from '@/lib/utils'
import Image from 'next/image'
import {
  fetchFollowingFeed,
  fetchFollowingIds,
  fetchSuggestedUsers,
  type FeedItem,
  type SuggestedUser,
} from '@/lib/follows'

const PAGE_SIZE = 10

export default function FollowingPage() {
  const [items, setItems] = useState<FeedItem[]>([])
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
    setLoadingMore(false)
  }, [items, followingIds, loadingMore])

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto flex items-center gap-2">
          <Users size={18} className="text-[#E8440A]" />
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Urmaresc</span>
          {followingIds.length > 0 && (
            <span className="text-[12px] text-[#9B9B9B]">· {followingIds.length} urmăriți</span>
          )}
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#E8440A]" />
          </div>
        ) : items.length === 0 ? (
          <div>
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 text-center mb-5">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1">
                {loggedIn ? 'Niciun post de la cei urmăriți' : 'Intră în cont ca să-ți urmărești călătorii'}
              </p>
              <p className="text-[13px] text-[#9B9B9B]">
                {loggedIn
                  ? 'Urmărește mai mulți călători ca să-ți umpli feedul.'
                  : 'Feedul „Urmaresc" adună postările oamenilor pe care îi urmărești.'}
              </p>
              {!loggedIn && (
                <Link href="/login" className="inline-flex mt-4 bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
                  Intră în cont
                </Link>
              )}
            </div>
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">Sugestii pentru tine</h2>
            <UserSuggestionList users={suggestions} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <article key={`${item.kind}-${item.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
                  <div className="p-3.5 pb-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={item.author?.username ? `/profile/${item.author.username}` : '#'}
                        className="flex items-center gap-2 min-w-0"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                          style={{ background: colorFor(item.author?.id || item.id) }}
                        >
                          {initialsOf(item.author?.full_name || item.author?.username)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#0F0F0F] truncate">
                            {item.author?.full_name || item.author?.username || 'User'}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#9B9B9B]">
                            <span className="bg-[#FFF0EB] text-[#E8440A] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">
                              {item.kind === 'trip' ? 'Calatorie' : 'Experienta'}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <span className="text-[11px] text-[#9B9B9B] ml-auto flex-shrink-0">{timeAgo(item.created_at)}</span>
                    </div>

                    {item.kind === 'trip' && (
                      <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">{item.title}</p>
                    )}
                    <p className="text-[14px] text-[#0F0F0F] leading-relaxed line-clamp-4">{item.text}</p>
                  </div>

                  {item.images.length > 0 && (
                    <div className="flex gap-1.5 px-3.5 pb-3">
                      {item.images.slice(0, 3).map((img, i) => (
                        <Image key={i} src={img} alt="" width={80} height={80} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                      ))}
                    </div>
                  )}

                  <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
                    <span className="text-[12px] text-[#6B6B6B] flex items-center gap-1 min-w-0">
                      {item.kind === 'trip'
                        ? <><Route size={13} className="flex-shrink-0" /> <span className="truncate">{item.countries?.join(', ') || 'Călătorie'}</span></>
                        : <><MapPin size={13} className="flex-shrink-0" /> <span className="truncate">{item.location?.name}{item.location?.city ? `, ${item.location.city}` : ''}</span></>}
                    </span>
                    <Link href={item.href} className="text-[12px] text-[#E8440A] font-medium flex-shrink-0">
                      Deschide →
                    </Link>
                  </div>
                </article>
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
