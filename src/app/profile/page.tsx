'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { Settings, Share2, Star, MapPin, ArrowUp, MessageCircle, Loader2, LogOut, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { getFollowCounts } from '@/lib/follows'
import ExperienceEditModal, { type EditableExperience } from '@/components/experience/ExperienceEditModal'
import { formatCount, timeAgo, shareLink } from '@/lib/utils'
import Link from 'next/link'

type Profile = {
  id: string
  full_name: string
  username: string
  bio: string | null
  avatar_url: string | null
  is_guide: boolean
  guide_level: number
  xp: number
}

type Experience = {
  id: string
  content: string
  images: string[]
  rating_experience: number
  rating_access: number | null
  rating_crowd: number | null
  upvotes: number
  comment_count: number
  created_at: string
  location: { id: string; name: string; city: string }
}

const TABS = ['Experiențe', 'Insigne']

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [shareNote, setShareNote] = useState('')
  const [editing, setEditing] = useState<EditableExperience | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: exps } = await supabase
        .from('experiences')
        .select('*, location:locations!location_id(id, name, city)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (prof) setProfile(prof as Profile)
      if (exps) setExperiences(exps as unknown as Experience[])
      setCounts(await getFollowCounts(supabase, user.id))
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleDeleteExperience = async (expId: string) => {
    if (!window.confirm('Ștergi experiența? Comentariile și voturile ei dispar odată cu ea.')) return

    const supabase = createClient()
    const { error } = await supabase.from('experiences').delete().eq('id', expId)
    if (error) {
      window.alert(`Nu am putut șterge experiența: ${error.message}`)
      return
    }
    setExperiences(prev => prev.filter(e => e.id !== expId))
  }

  const handleShare = async () => {
    if (!profile) return
    const result = await shareLink(
      `${window.location.origin}/profile/${profile.username}`,
      `${profile.full_name} pe Pocoloco`
    )
    if (result === 'copied') {
      setShareNote('Link copiat')
      setTimeout(() => setShareNote(''), 2000)
    }
  }

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-[#6B6B6B]">Trebuie să fii logat.</p>
      <Link href="/login" className="text-[#E8440A] font-medium">Intră în cont</Link>
    </div>
  )

  const BADGES_EARNED = [
    ...(experiences.length >= 1 ? [{ emoji: '✍️', name: 'Prima experiență', bg: '#EEEDFB' }] : []),
    ...(experiences.length >= 10 ? [{ emoji: '🏆', name: '10 Experiențe', bg: '#FFF0EB' }] : []),
    ...(profile.is_guide ? [{ emoji: '⭐', name: 'Ghid Experimentat', bg: '#FFFBEB' }] : []),
  ]

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Profilul meu</span>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-[#FEF2F2] border border-[rgba(220,38,38,0.1)] flex items-center justify-center">
            <LogOut size={16} className="text-[#DC2626]" />
          </button>
          <Link href="/settings" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center" aria-label="Setări">
            <Settings size={16} className="text-[#6B6B6B]" />
          </Link>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto">
        {/* Hero */}
        <div className="bg-white px-5 pt-6 pb-5 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 3px white, 0 0 0 5px #E8440A' }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8440A] to-orange-400 flex items-center justify-center font-outfit text-3xl font-bold text-white" style={{ boxShadow: '0 0 0 3px white, 0 0 0 5px #E8440A' }}>
                  {getInitials(profile.full_name)}
                </div>
              )}
              {profile.is_guide && (
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
                  <Star size={11} className="text-white fill-white" />
                </div>
              )}
            </div>
            <button
              onClick={handleShare}
              className="bg-[#EEEDFB] text-[#5B4FCF] font-outfit text-[12px] font-semibold px-3 py-2 rounded-full flex items-center gap-1"
            >
              <Share2 size={13} /> {shareNote || 'Share'}
            </button>
          </div>
          <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F]">{profile.full_name}</h1>
          <p className="text-[13px] text-[#9B9B9B] mb-2">@{profile.username}{profile.is_guide ? ' · Ghid Experimentat' : ''}</p>
          {profile.bio && <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-3">{profile.bio}</p>}

          <div className="flex pt-4 border-t border-[rgba(0,0,0,0.08)]">
            {[
              { value: formatCount(experiences.length), label: 'experiențe' },
              { value: formatCount(counts.followers), label: 'urmăritori' },
              { value: formatCount(counts.following), label: 'urmăresc' },
              { value: formatCount(profile.xp), label: 'XP' },
            ].map((s, i, arr) => (
              <div key={s.label} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''}`}>
                <div className="font-outfit text-[18px] font-bold text-[#0F0F0F]">{s.value}</div>
                <div className="text-[11px] text-[#9B9B9B]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* XP bar */}
        <div className="bg-gradient-to-r from-[#EEEDFB] to-[#F0EEFF] px-5 py-3.5 flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)]">
          <div className="w-11 h-11 bg-[#5B4FCF] rounded-xl flex items-center justify-center text-xl flex-shrink-0">🧭</div>
          <div className="flex-1">
            <div className="font-outfit text-[14px] font-semibold text-[#5B4FCF]">
              {profile.is_guide ? 'Ghid Experimentat' : 'Explorator'} · Nivel {profile.guide_level}
            </div>
            <div className="h-1.5 bg-[rgba(91,79,207,0.15)] rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-[#5B4FCF] rounded-full" style={{ width: `${Math.min((profile.xp % 1000) / 10, 100)}%` }} />
            </div>
            <div className="text-[10px] text-[#5B4FCF] font-medium mt-0.5">{profile.xp} XP</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-[rgba(0,0,0,0.08)] sticky top-[57px] z-20">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`flex-1 py-3 text-[13px] font-outfit font-medium border-b-2 transition-colors ${tab === i ? 'text-[#E8440A] border-[#E8440A]' : 'text-[#9B9B9B] border-transparent'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="px-5 pt-4">
          {tab === 0 && (
            <div className="flex flex-col gap-3">
              {experiences.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
                  <p className="text-[14px] text-[#9B9B9B] mb-3">Nicio experiență adăugată încă.</p>
                  <Link href="/add-experience" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
                    + Adaugă prima experiență
                  </Link>
                </div>
              ) : experiences.map(exp => (
                // cardul e un div, nu un link: butoanele de editare n-au voie
                // să stea într-un <a>
                <div key={exp.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <Link href={`/location/${exp.location?.id}`} className="min-w-0 hover:text-[#E8440A] transition-colors">
                      <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{exp.location?.name}</h3>
                      <p className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MapPin size={10} /> {exp.location?.city}</p>
                    </Link>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= exp.rating_experience ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2 line-clamp-2">{exp.content}</p>
                  {exp.images && exp.images.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {exp.images.slice(0, 3).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] text-[#9B9B9B]">{timeAgo(exp.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><ArrowUp size={11} /> {formatCount(exp.upvotes)}</span>
                      <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MessageCircle size={11} /> {formatCount(exp.comment_count)}</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-2.5 border-t border-[rgba(0,0,0,0.06)]">
                    <button
                      onClick={() => setEditing({
                        id: exp.id,
                        content: exp.content,
                        rating_experience: exp.rating_experience,
                        rating_access: exp.rating_access ?? null,
                        rating_crowd: exp.rating_crowd ?? null,
                      })}
                      className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                    >
                      <Pencil size={11} /> Editează
                    </button>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Șterge
                    </button>
                    <Link
                      href={`/location/${exp.location?.id}`}
                      className="ml-auto text-[11px] text-[#6B6B6B] px-3 py-1.5 rounded-lg font-medium"
                    >
                      Vezi →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 1 && (
            <div>
              <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-3">Insigne câștigate</h3>
              {BADGES_EARNED.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
                  <p className="text-[13px] text-[#9B9B9B]">Adaugă prima experiență pentru a câștiga prima insignă!</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {BADGES_EARNED.map(b => (
                    <div key={b.name} className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: b.bg, boxShadow: '0 0 0 2px #E8440A' }}>{b.emoji}</div>
                      <span className="text-[10px] text-[#6B6B6B] text-center leading-tight font-medium">{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {editing && (
        <ExperienceEditModal
          experience={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setExperiences(prev => prev.map(e => (e.id === updated.id ? { ...e, ...updated } : e)))
            setEditing(null)
          }}
        />
      )}

      <BottomNav />
    </main>
  )
}
