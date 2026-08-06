'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, MapPin, ArrowUp, MessageCircle, Loader2 } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FollowButton from '@/components/profile/FollowButton'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { getFollowCounts, isFollowing } from '@/lib/follows'
import { fetchBadges, type EarnedBadge } from '@/lib/badges'
import BadgeGrid from '@/components/profile/BadgeGrid'
import { formatCount, timeAgo } from '@/lib/utils'
import Image from 'next/image'

type PublicProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_guide: boolean | null
  guide_level: number | null
  xp: number | null
  created_at: string
}

type Experience = {
  id: string
  content: string
  images: string[] | null
  rating_experience: number
  upvotes: number
  comment_count: number
  created_at: string
  location: { id: string; name: string; city: string | null } | null
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [badges, setBadges] = useState<EarnedBadge[]>([])
  const [followsThem, setFollowsThem] = useState<boolean | undefined>(undefined)
  const [isMe, setIsMe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, is_guide, guide_level, xp, created_at')
        .eq('username', username)
        .maybeSingle()

      // eroarea de rețea nu înseamnă că userul nu există
      if (profError) setLoadError(true)
      if (!prof) { setLoading(false); return }
      const publicProfile = prof as PublicProfile
      setProfile(publicProfile)

      const { data: { user } } = await supabase.auth.getUser()
      setIsMe(user?.id === publicProfile.id)

      const [exps, followCounts, userBadges] = await Promise.all([
        supabase
          .from('experiences')
          .select('id, content, images, rating_experience, upvotes, comment_count, created_at, location:locations!location_id!inner(id, name, city, status)')
          .eq('author_id', publicProfile.id)
          .eq('status', 'active')
          .eq('location.status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50),
        getFollowCounts(supabase, publicProfile.id),
        fetchBadges(supabase, publicProfile.id),
      ])

      setExperiences((exps.data || []) as unknown as Experience[])
      setCounts(followCounts)
      setBadges(userBadges.earned)

      if (user && user.id !== publicProfile.id) {
        setFollowsThem(await isFollowing(supabase, user.id, publicProfile.id))
      } else {
        setFollowsThem(false)
      }

      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">{loadError ? '📡' : '🧭'}</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">
        {loadError ? 'Nu am putut încărca profilul' : 'Userul nu există'}
      </p>
      <p className="text-[13px] text-[#6B6B6B]">
        {loadError ? 'Verifică conexiunea și reîncarcă pagina.' : `Nu am găsit niciun profil cu @${username}.`}
      </p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate">
          {profile.full_name || `@${profile.username}`}
        </span>
      </div>

      <div className="max-w-[780px] mx-auto">
        {/* Hero */}
        <div className="bg-white px-5 pt-6 pb-5 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 3px white, 0 0 0 5px #E8440A' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-outfit text-3xl font-bold text-white"
                  style={{ background: colorFor(profile.id), boxShadow: '0 0 0 3px white, 0 0 0 5px #E8440A' }}
                >
                  {initialsOf(profile.full_name || profile.username)}
                </div>
              )}
              {profile.is_guide && (
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
                  <Star size={11} className="text-white fill-white" />
                </div>
              )}
            </div>
            {isMe ? (
              <Link href="/profile" className="bg-[#EEEDFB] text-[#5B4FCF] font-outfit text-[12px] font-semibold px-3 py-2 rounded-full">
                Profilul meu
              </Link>
            ) : (
              <FollowButton
                targetUserId={profile.id}
                targetName={profile.full_name || profile.username}
                initialFollowing={followsThem}
                onChange={f => setCounts(c => ({ ...c, followers: c.followers + (f ? 1 : -1) }))}
              />
            )}
          </div>

          <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F]">{profile.full_name || profile.username}</h1>
          <p className="text-[13px] text-[#9B9B9B] mb-2">
            @{profile.username}{profile.is_guide ? ' · Ghid Experimentat' : ''}
          </p>
          {profile.bio && <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-3">{profile.bio}</p>}
          <p className="text-[11px] text-[#9B9B9B] mb-3">Membru din {new Date(profile.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</p>

          <div className="flex pt-4 border-t border-[rgba(0,0,0,0.08)]">
            {[
              { value: experiences.length, label: 'experiențe' },
              { value: counts.followers, label: 'urmăritori' },
              { value: counts.following, label: 'urmărește' },
              { value: profile.xp || 0, label: 'XP' },
            ].map((s, i, arr) => (
              <div key={s.label} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''}`}>
                <div className="font-outfit text-[18px] font-bold text-[#0F0F0F]">{formatCount(s.value)}</div>
                <div className="text-[11px] text-[#9B9B9B]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Insigne */}
        {badges.length > 0 && (
          <div className="px-5 pt-4">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Insigne ({badges.length})
            </h2>
            <BadgeGrid earned={badges} />
          </div>
        )}

        {/* Experiențe */}
        <div className="px-5 pt-4">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
            Experiențe ({experiences.length})
          </h2>

          {experiences.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <p className="text-[14px] text-[#9B9B9B]">Niciun post public încă.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {experiences.map(exp => (
                <Link
                  key={exp.id}
                  href={exp.location ? `/location/${exp.location.id}` : '#'}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 block hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0">
                      <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{exp.location?.name}</h3>
                      <p className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5">
                        <MapPin size={10} /> {exp.location?.city}
                      </p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={12} className={i <= exp.rating_experience ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2 line-clamp-3">{exp.content}</p>
                  {exp.images && exp.images.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {exp.images.slice(0, 3).map((img, i) => (
                        <Image key={i} src={img} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#9B9B9B]">{timeAgo(exp.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><ArrowUp size={11} /> {formatCount(exp.upvotes)}</span>
                      <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MessageCircle size={11} /> {formatCount(exp.comment_count)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
