'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, MapPin, ArrowUp, MessageCircle, Loader2 } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FollowButton from '@/components/profile/FollowButton'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { getFollowCounts, isFollowing, type FollowListKind } from '@/lib/follows'
import FollowListSheet from '@/components/profile/FollowListSheet'
import { fetchBadges, type EarnedBadge } from '@/lib/badges'
import BadgeGrid from '@/components/profile/BadgeGrid'
import SavedLocationList from '@/components/profile/SavedLocationList'
import TravelMap from '@/components/profile/TravelMap'
import LevelBadge from '@/components/profile/LevelBadge'
import { fetchSavedLocations, type SavedLocation } from '@/lib/saves'
import { formatCount, timeAgo } from '@/lib/utils'
import { activityLabel } from '@/lib/activities'
import Image from 'next/image'

type PublicProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_guide: boolean | null
  created_at: string
  points_total?: number | null
  points_level?: number | null
}

type Experience = {
  id: string
  kind?: string | null
  title?: string | null
  activity_category?: string | null
  activity_area?: string | null
  content: string
  images: string[] | null
  rating_experience: number | null
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
  /** ce listă de oameni e deschisă, dacă vreuna */
  const [list, setList] = useState<FollowListKind | null>(null)
  const [badges, setBadges] = useState<EarnedBadge[]>([])
  const [visited, setVisited] = useState<SavedLocation[]>([])
  const [followsThem, setFollowsThem] = useState<boolean | undefined>(undefined)
  const [isMe, setIsMe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      // eroarea de rețea nu înseamnă că userul nu există
      if (profError) setLoadError(true)
      if (!prof) { setLoading(false); return }
      const publicProfile = prof as PublicProfile
      setProfile(publicProfile)

      const { data: { user } } = await supabase.auth.getUser()
      setIsMe(user?.id === publicProfile.id)

      const [exps, followCounts, userBadges, been] = await Promise.all([
        supabase
          .from('experiences')
          .select('id, kind, title, activity_category, activity_area, content, images, rating_experience, upvotes, comment_count, created_at, location:locations!location_id(id, name, city, status)')
          .eq('author_id', publicProfile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50),
        getFollowCounts(supabase, publicProfile.id),
        fetchBadges(supabase, publicProfile.id),
        fetchSavedLocations(supabase, publicProfile.id, 'visited'),
      ])

      // join stâng: activitățile n-au locație. Ce e legat de un loc
      // neaprobat rămâne ascuns, ca înainte.
      setExperiences(((exps.data || []) as unknown as Experience[])
        .filter(e => e.kind === 'activity' || (e.location as { status?: string } | null)?.status === 'approved'))
      setCounts(followCounts)
      setBadges(userBadges.earned)
      setVisited(been)

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
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-[13px] text-[#9B9B9B]">
              @{profile.username}{profile.is_guide ? ' · Ghid Experimentat' : ''}
            </p>
            <LevelBadge points={profile.points_total} level={profile.points_level} />
          </div>
          {profile.bio && <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-3 whitespace-pre-line">{profile.bio}</p>}
          <p className="text-[11px] text-[#9B9B9B] mb-3">Membru din {new Date(profile.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</p>

          <div className="flex pt-4 border-t border-[rgba(0,0,0,0.08)]">
            {[
              { value: experiences.length, label: 'experiențe' },
              { value: visited.length, label: 'locuri vizitate' },
              { value: counts.followers, label: 'urmăritori', list: 'followers' as const },
              { value: counts.following, label: 'urmărește', list: 'following' as const },
            ].map((s, i, arr) => {
              const inner = (
                <>
                  <div className="font-outfit text-[18px] font-bold text-[#0F0F0F]">{formatCount(s.value)}</div>
                  <div className="text-[11px] text-[#9B9B9B] leading-tight">{s.label}</div>
                </>
              )
              const className = `flex-1 text-center ${i < arr.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''}`

              // cifrele de follow duc în listă; celelalte două n-au unde
              return s.list ? (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setList(s.list)}
                  className={`${className} hover:bg-[#F8F7F5] transition-colors`}
                >
                  {inner}
                </button>
              ) : (
                <div key={s.label} className={className}>{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Harta călătorului — doar locurile vizitate, „Vreau să merg" e privat */}
        <TravelMap userId={profile.id} />

        {/* Insigne */}
        {badges.length > 0 && (
          <div className="px-5 pt-4">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Insigne ({badges.length})
            </h2>
            <BadgeGrid earned={badges} />
          </div>
        )}

        {/* Am fost — lista publică; „Vreau să merg" rămâne privată */}
        {visited.length > 0 && (
          <div className="px-5 pt-4">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Am fost ({visited.length})
            </h2>
            <SavedLocationList
              items={visited}
              emptyTitle=""
              emptyDescription=""
            />
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
                  href={exp.location ? `/location/${exp.location.id}` : `/experience/${exp.id}`}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 block hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0">
                      <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
                        {exp.kind === 'activity' ? (exp.title || 'Activitate') : exp.location?.name}
                      </h3>
                      <p className="text-[11px] text-[#9B9B9B] flex items-center gap-1 flex-wrap">
                        {exp.kind === 'activity' ? (
                          <>
                            <span className="bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">
                              {activityLabel(exp.activity_category) || '🪂 Activitate'}
                            </span>
                            {exp.activity_area && <span className="flex items-center gap-0.5"><MapPin size={10} /> {exp.activity_area}</span>}
                          </>
                        ) : (
                          <span className="flex items-center gap-0.5"><MapPin size={10} /> {exp.location?.city}</span>
                        )}
                      </p>
                    </div>
                    {exp.rating_experience ? (
                      <div className="flex gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={12} className={i <= (exp.rating_experience || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9B9B9B] flex-shrink-0">Fără notă</span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2 line-clamp-3 whitespace-pre-line">{exp.content}</p>
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
      {list && (
        <FollowListSheet
          userId={profile.id}
          kind={list}
          title={list === 'followers' ? 'Urmăritori' : 'Urmărește'}
          onClose={() => setList(null)}
        />
      )}

      <BottomNav />
    </main>
  )
}
