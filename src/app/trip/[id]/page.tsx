'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Users, Globe, Loader2, Star } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FollowButton from '@/components/profile/FollowButton'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { timeAgo, TRANSPORT_TYPES } from '@/lib/utils'

type Trip = {
  id: string
  author_id: string
  title: string
  description: string | null
  duration_days: number | null
  transport_type: string | null
  person_count: number | null
  countries: string[] | null
  cover_image: string | null
  status: string
  created_at: string
}

type Author = {
  id: string
  username: string | null
  full_name: string | null
  is_guide: boolean | null
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('trips').select('*').eq('id', id).maybeSingle()

      if (data) {
        const t = data as Trip
        setTrip(t)
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, username, full_name, is_guide')
          .eq('id', t.author_id)
          .maybeSingle()
        setAuthor((prof as Author) || null)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!trip || trip.status === 'removed') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">🧭</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Călătoria nu a fost găsită</p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  const transport = TRANSPORT_TYPES.find(t => t.id === trip.transport_type)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate">{trip.title}</span>
      </div>

      <div className="max-w-[680px] mx-auto">
        <div className="h-52 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] relative overflow-hidden">
          {trip.cover_image
            ? <img src={trip.cover_image} alt={trip.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🧭</div>}
        </div>

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F] mb-2">{trip.title}</h1>
          <div className="flex flex-wrap gap-2">
            {trip.duration_days && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Calendar size={12} /> {trip.duration_days} zile
              </span>
            )}
            {transport && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1">
                {transport.emoji} {transport.label}
              </span>
            )}
            {trip.person_count && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Users size={12} /> {trip.person_count} persoane
              </span>
            )}
            {trip.countries && trip.countries.length > 0 && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Globe size={12} /> {trip.countries.join(', ')}
              </span>
            )}
          </div>
        </div>

        {author && (
          <div className="bg-white px-5 py-3 flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.08)]">
            <Link href={`/profile/${author.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: colorFor(author.id) }}
              >
                {initialsOf(author.full_name || author.username)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#0F0F0F] truncate flex items-center gap-1.5">
                  {author.full_name || author.username}
                  {author.is_guide && <Star size={11} className="text-[#5B4FCF] fill-[#5B4FCF]" />}
                </div>
                <div className="text-[11px] text-[#9B9B9B]">{timeAgo(trip.created_at)}</div>
              </div>
            </Link>
            <FollowButton targetUserId={author.id} size="sm" />
          </div>
        )}

        {trip.description && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed whitespace-pre-line">{trip.description}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
