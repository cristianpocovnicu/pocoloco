'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bookmark, CheckCircle, Share2, MapPin, Route, Star, MessageCircle, Pencil, Loader2, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatCount, timeAgo } from '@/lib/utils'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import BottomNav from '@/components/layout/BottomNav'
import VoteButtons from '@/components/experience/VoteButtons'
import FollowButton from '@/components/profile/FollowButton'

type Location = {
  id: string
  name: string
  city: string
  country: string
  description: string | null
  cover_image: string | null
  score: number
  experience_count: number
  trip_count: number
  status: 'pending' | 'approved' | 'rejected'
  added_by: string
  adder?: { full_name: string; is_guide: boolean }
}

type Experience = {
  id: string
  content: string
  images: string[]
  tips: string[]
  rating_experience: number
  rating_access: number | null
  rating_crowd: number | null
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author: { id: string; username: string | null; full_name: string; is_guide: boolean } | null
}

export default function LocationPage() {
  const { id } = useParams()
  const router = useRouter()
  const [location, setLocation] = useState<Location | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  // locațiile neaprobate sunt vizibile doar celui care le-a adăugat și adminilor
  const [canModerate, setCanModerate] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()

      const { data: loc } = await supabase
        .from('locations')
        .select('*, adder:profiles!added_by(full_name, is_guide)')
        .eq('id', id)
        .maybeSingle()

      const { data: exps } = await supabase
        .from('experiences')
        .select('*, author:profiles!author_id(id, username, full_name, is_guide)')
        .eq('location_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (loc) {
        const location = loc as unknown as Location

        if (location.status !== 'approved') {
          const { data: { user } } = await supabase.auth.getUser()
          let allowed = false
          if (user) {
            if (location.added_by === user.id) {
              allowed = true
            } else {
              const { data: prof } = await supabase
                .from('profiles').select('role').eq('id', user.id).maybeSingle()
              allowed = prof?.role === 'admin'
            }
          }
          setCanModerate(allowed)
          if (allowed) setLocation(location)
          else setBlocked(true)
        } else {
          setLocation(location)
        }
      }

      if (exps) {
        const list = exps as unknown as Experience[]
        setExperiences(list)
        setMyVotes(await fetchMyVotes(supabase, list.map(e => e.id)))
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (!saved) {
      await supabase.from('saves').insert({ user_id: user.id, location_id: id })
      setSaved(true)
    } else {
      await supabase.from('saves').delete().eq('user_id', user.id).eq('location_id', id)
      setSaved(false)
    }
  }

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const avgRating = (key: 'rating_experience' | 'rating_access' | 'rating_crowd') => {
    const valid = experiences.filter(e => e[key] != null)
    if (!valid.length) return null
    return (valid.reduce((s, e) => s + (e[key] || 0), 0) / valid.length).toFixed(1)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!location) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      {blocked ? (
        <>
          <div className="text-4xl">⏳</div>
          <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Locația așteaptă aprobare</p>
          <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">
            Un administrator verifică locația înainte să devină publică. Revino puțin mai târziu.
          </p>
        </>
      ) : (
        <p className="text-[#6B6B6B]">Locația nu a fost găsită.</p>
      )}
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      {/* Topbar */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate mx-3 flex-1 text-center">{location.name}</span>
        <button className="w-8 h-8 rounded-full bg-[#EEEDFB] flex items-center justify-center">
          <Globe size={16} className="text-[#5B4FCF]" />
        </button>
      </div>

      <div className="max-w-[680px] mx-auto">
        {/* Banner de moderare — doar pentru autor și admini */}
        {canModerate && location.status !== 'approved' && (
          <div className={`px-5 py-3 flex items-start gap-2.5 border-b ${location.status === 'rejected' ? 'bg-[#FEF2F2] border-[rgba(220,38,38,0.15)]' : 'bg-[#FFFBEB] border-[rgba(217,119,6,0.15)]'}`}>
            <span className="text-lg leading-none mt-0.5">{location.status === 'rejected' ? '🚫' : '⏳'}</span>
            <div>
              <p className={`font-outfit text-[13px] font-semibold ${location.status === 'rejected' ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                {location.status === 'rejected' ? 'Locație respinsă' : 'Locație în așteptarea aprobării'}
              </p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                {location.status === 'rejected'
                  ? 'Un administrator a respins această locație, așa că nu apare public.'
                  : 'Doar tu și administratorii vedeți această pagină până la aprobare. Nu apare în căutare sau în feed.'}
              </p>
            </div>
          </div>
        )}

        {/* Cover image / gradient */}
        <div className="h-52 bg-gradient-to-br from-amber-200 to-amber-600 relative overflow-hidden">
          {location.cover_image
            ? <img src={location.cover_image} alt={location.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🏔️</div>
          }
          {location.score > 0 && (
            <span className="absolute top-3 right-3 bg-[#E8440A] text-white font-outfit text-sm font-bold px-3 py-1 rounded-full">
              {location.score.toFixed(1)} / 10
            </span>
          )}
        </div>

        {/* Title & Actions */}
        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F] mb-1">{location.name}</h1>
          <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1 mb-3">
            <MapPin size={12} /> {location.city}{location.country ? `, ${location.country}` : ''}
          </p>
          <div className="flex gap-2">
            <button onClick={handleSave} className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors ${saved ? 'bg-[#FFF0EB] text-[#E8440A] border border-[rgba(232,68,10,0.2)]' : 'bg-[#E8440A] text-white'}`}>
              <Bookmark size={15} fill={saved ? '#E8440A' : 'none'} /> {saved ? 'Salvat' : 'Vreau să merg'}
            </button>
            <button className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-sm font-medium rounded-full px-4 py-2.5 flex items-center gap-2">
              <CheckCircle size={15} /> Am fost
            </button>
            <button className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
              <Share2 size={16} className="text-[#6B6B6B]" />
            </button>
          </div>
        </div>

        {/* Added by */}
        {location.adder && (
          <div className="bg-white px-5 py-3 flex items-center gap-2 border-b border-[rgba(0,0,0,0.08)]">
            <span className="text-[12px] text-[#9B9B9B]">Adăugat de</span>
            <div className="w-6 h-6 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[10px] font-bold text-white">
              {getInitials(location.adder.full_name)}
            </div>
            <span className="text-[13px] font-medium text-[#0F0F0F]">{location.adder.full_name}</span>
            {location.adder.is_guide && (
              <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-2 py-0.5 rounded-full font-medium">Ghid Experimentat</span>
            )}
          </div>
        )}

        {/* Description */}
        {location.description && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">{location.description}</p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white px-5 py-3 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
            <MessageCircle size={14} /> <strong>{experiences.length}</strong> experiențe
          </div>
          {location.trip_count > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
              <Route size={14} /> în <strong>{location.trip_count}</strong> călătorii
            </div>
          )}
        </div>

        {/* Ratings summary */}
        {experiences.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">Evaluare medie</h2>
            {[
              { label: 'Experiență generală', key: 'rating_experience' as const },
              { label: 'Acces și organizare', key: 'rating_access' as const },
              { label: 'Aglomerație', key: 'rating_crowd' as const },
            ].map(({ label, key }) => {
              const avg = avgRating(key)
              if (!avg) return null
              return (
                <div key={key} className="flex items-center gap-3 mb-2.5">
                  <span className="text-[13px] text-[#6B6B6B] w-40 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E8440A] rounded-full" style={{ width: `${(parseFloat(avg) / 5) * 100}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F0F0F] w-7 text-right">{avg}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <Link href={`/add-experience?location=${id}&name=${encodeURIComponent(location.name)}`} className="mx-5 my-3 bg-[#5B4FCF] rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer block">
          <Pencil size={20} className="text-white/80" />
          <span className="font-outfit text-sm font-semibold text-white flex-1">Povestește-ne experiența ta</span>
          <span className="text-white/60">→</span>
        </Link>

        {/* Experiences */}
        <div className="px-5 pb-6">
          <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] py-3">
            Experiențe ({experiences.length})
          </h2>

          {experiences.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <p className="text-[14px] text-[#9B9B9B]">Nicio experiență încă. Fii primul!</p>
            </div>
          ) : (
            experiences.map(exp => (
              <div key={exp.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden mb-3">
                <div className="p-3.5">
                  <div className="flex items-center gap-2 mb-3">
                    <Link
                      href={exp.author?.username ? `/profile/${exp.author.username}` : '#'}
                      className="flex items-center gap-2 min-w-0 flex-1"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                        {getInitials(exp.author?.full_name || '')}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-[#0F0F0F]">{exp.author?.full_name}</span>
                        {exp.author?.is_guide && <span className="ml-1.5 text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-medium">Ghid</span>}
                        <div className="text-[11px] text-[#9B9B9B]">{timeAgo(exp.created_at)}</div>
                      </div>
                    </Link>
                    {exp.author?.id && <FollowButton targetUserId={exp.author.id} size="sm" />}
                  </div>

                  {/* Stars */}
                  {[
                    { label: 'Experiență', val: exp.rating_experience },
                    { label: 'Aglomerație', val: exp.rating_crowd },
                    { label: 'Acces', val: exp.rating_access },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-[#6B6B6B]">{r.label}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={11} className={i <= (r.val || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    </div>
                  ))}

                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mt-2">{exp.content}</p>

                  {/* Tips */}
                  {exp.tips && exp.tips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.tips.map(tip => (
                        <span key={tip} className="text-[11px] bg-[#FFF0EB] text-[#E8440A] px-2 py-0.5 rounded-full">✓ {tip}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Images */}
                {exp.images && exp.images.length > 0 && (
                  <div className="flex gap-1.5 px-3.5 pb-3 overflow-x-auto scrollbar-hide">
                    {exp.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-2">
                    <VoteButtons
                      experienceId={exp.id}
                      upvotes={exp.upvotes}
                      downvotes={exp.downvotes}
                      myVote={myVotes[exp.id] ?? null}
                    />
                    <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                      <MessageCircle size={12} /> {formatCount(exp.comment_count)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
