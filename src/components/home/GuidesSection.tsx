'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchFollowingIds } from '@/lib/follows'
import FollowButton from '@/components/profile/FollowButton'
import Image from 'next/image'

type Guide = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  experienceCount: number
}

export default function GuidesSection() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('is_guide', true)
        .limit(20)

      const profiles = (data || []) as Omit<Guide, 'experienceCount'>[]
      if (profiles.length === 0) { setLoading(false); return }

      // câte experiențe are fiecare, dintr-un singur query
      const { data: exps } = await supabase
        .from('experiences')
        .select('author_id')
        .eq('status', 'active')
        .in('author_id', profiles.map(p => p.id))

      const counts: Record<string, number> = {}
      for (const row of (exps || []) as { author_id: string }[]) {
        counts[row.author_id] = (counts[row.author_id] || 0) + 1
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) setFollowingIds(await fetchFollowingIds(supabase, user.id))

      setGuides(
        profiles
          .map(p => ({ ...p, experienceCount: counts[p.id] || 0 }))
          .sort((a, b) => b.experienceCount - a.experienceCount)
          .slice(0, 5)
      )
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Ghizi de urmărit</h2>
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  // fără ghizi în comunitate, secțiunea n-are ce arăta
  if (guides.length === 0) return null

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Ghizi de urmărit</h2>
        <Link href="/search" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      <div className="flex flex-col gap-2.5">
        {guides.map(guide => (
          <div key={guide.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex items-center gap-3">
            <Link href={`/profile/${guide.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                {guide.avatar_url ? (
                  <Image src={guide.avatar_url} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-outfit text-[14px] font-bold text-white"
                    style={{ background: colorFor(guide.id) }}
                  >
                    {initialsOf(guide.full_name || guide.username)}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
                  <Star size={9} className="text-white fill-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
                  {guide.full_name || guide.username}
                </p>
                <p className="text-[11px] text-[#9B9B9B] truncate">
                  Ghid · {guide.experienceCount} {guide.experienceCount === 1 ? 'experiență' : 'experiențe'}
                </p>
              </div>
            </Link>
            <FollowButton
              targetUserId={guide.id}
              targetName={guide.full_name || guide.username}
              initialFollowing={followingIds.includes(guide.id)}
              size="sm"
              className="flex-shrink-0"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
