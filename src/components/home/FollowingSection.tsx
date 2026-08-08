'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchFollowingFeed, fetchFollowingIds, type FeedItem } from '@/lib/follows'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import FeedCard, { toFeedCardItem } from '@/components/feed/FeedCard'
import { useFeedScope } from '@/components/feed/FeedScope'

/** Cât încape pe homepage fără să înghită restul paginii. */
const LIMIT = 4

export default function FollowingSection() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  const [loading, setLoading] = useState(true)
  const { publishShown } = useFeedScope()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      // secțiunea e despre cine urmărești — pentru un vizitator n-are subiect
      if (!user) { setLoading(false); publishShown([]); return }

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
      // și lista goală e un răspuns: fără ea secțiunea de jos ar aștepta
      publishShown(feed.map(item => item.id))
    }
    load()
  }, [publishShown])

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
    /*
     * Banda violet stă în gutter-ul paginii (-ml-3 anulează pl-3), deci
     * cardurile rămân exact la fel de late ca în restul homepage-ului.
     * Marja e de 16px pe mobil, banda ocupă 12 — nu iese din ecran.
     */
    <section className="mb-7 -ml-3 pl-3 border-l-2 border-[#5B4FCF]/30">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FCF] flex-shrink-0" />
          Urmăresc
        </h2>
        <Link href="/following" className="text-sm text-[#5B4FCF] font-medium">Vezi tot</Link>
      </div>

      {/* aceleași carduri ca „Din comunitate" — o singură componentă,
          deci și pe mobil se comportă la fel */}
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <FeedCard
            key={`${item.kind}-${item.id}`}
            item={toFeedCardItem(item)}
            myVote={myVotes[item.id] ?? null}
            variant="following"
          />
        ))}
      </div>
    </section>
  )
}
