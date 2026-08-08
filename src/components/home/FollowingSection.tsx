'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchFollowingFeed, fetchFollowingIds, type FeedItem } from '@/lib/follows'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import { activityLabel } from '@/lib/activities'
import FeedCard from '@/components/feed/FeedCard'

/** Cât încape pe homepage fără să înghită restul paginii. */
const LIMIT = 4

export default function FollowingSection() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      // secțiunea e despre cine urmărești — pentru un vizitator n-are subiect
      if (!user) { setLoading(false); return }

      const followingIds = await fetchFollowingIds(supabase, user.id)
      const feed = followingIds.length > 0
        ? await fetchFollowingFeed(supabase, followingIds, { limit: LIMIT })
        : []

      setItems(feed)
      if (feed.length > 0) {
        setMyVotes(await fetchMyVotes(
          supabase,
          feed.filter(item => item.kind === 'experience').map(item => item.id)
        ))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Urmăresc</h2>
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  /*
   * Nelogat, nimeni urmărit sau feed gol — toate trei arată la fel aici:
   * nimic. Un empty state pe homepage ar cere atenție pentru o lipsă;
   * cine vrea sugestii le găsește pe /following.
   */
  if (items.length === 0) return null

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Urmăresc</h2>
        <Link href="/following" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      {/* aceleași carduri ca „Din comunitate" — o singură componentă,
          deci și pe mobil se comportă la fel */}
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <FeedCard
            key={`${item.kind}-${item.id}`}
            item={{
              id: item.id,
              kind: item.kind,
              href: item.href,
              createdAt: item.created_at,
              author: item.author,
              isActivity: !!item.activityTitle,
              activityCategory: item.activityCategory,
              place: item.kind === 'trip'
                ? (item.countries?.join(', ') || null)
                : item.activityTitle
                  ? (item.activityArea || activityLabel(item.activityCategory) || null)
                  : item.location
                    ? `${item.location.name}${item.location.city ? `, ${item.location.city}` : ''}`
                    : null,
              isGuide: item.isGuide,
              title: item.kind === 'trip' ? item.title : item.activityTitle,
              text: item.text,
              images: item.images,
              upvotes: item.upvotes,
              downvotes: item.downvotes,
              commentCount: item.commentCount,
              saveCount: item.saveCount,
            }}
            myVote={myVotes[item.id] ?? null}
          />
        ))}
      </div>
    </section>
  )
}
