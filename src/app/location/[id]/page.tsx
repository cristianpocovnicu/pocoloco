'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bookmark, CheckCircle, MapPin, Route, Star, MessageCircle, Pencil, Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatCount, timeAgo, formatDistance, CATEGORY_ICONS } from '@/lib/utils'
import { formatVisitedPeriod } from '@/lib/period'
import ShareButton from '@/components/ui/ShareButton'
import { fetchMyVotes, netScore, HIDE_THRESHOLD_EXPERIENCE, type VoteType } from '@/lib/votes'
import { fetchCommentsFor, type CommentWithAuthor } from '@/lib/comments'
import BottomNav from '@/components/layout/BottomNav'
import VoteButtons from '@/components/experience/VoteButtons'
import HiddenByVotes from '@/components/experience/HiddenByVotes'
import FollowButton from '@/components/profile/FollowButton'
import CommentThread, { type CommentViewer } from '@/components/experience/CommentThread'
import ExperienceEditModal, { type EditableExperience } from '@/components/experience/ExperienceEditModal'
import PhotoGallery from '@/components/location/PhotoGallery'
import VisitPrompt from '@/components/location/VisitPrompt'
import DynamicMap from '@/components/map/DynamicMap'
import { getLocationSaveStatus, setLocationSaveStatus, type SaveStatus } from '@/lib/saves'
import { fetchLocationCovers } from '@/lib/covers'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'
import CoverImage from '@/components/ui/CoverImage'

type Location = {
  id: string
  name: string
  city: string
  country: string
  description: string | null
  cover_image: string | null
  /** 'google' când coperta e preluată din Places — atunci dăm atribuirea */
  cover_source?: string | null
  latitude: number | null
  longitude: number | null
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
  visited_year: number | null
  visited_month: number | null
  rating_experience: number | null
  rating_access: number | null
  rating_crowd: number | null
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author: { id: string; username: string | null; full_name: string; is_guide: boolean } | null
}

type NearbyLocation = {
  id: string
  name: string
  city: string | null
  category: string | null
  cover_image: string | null
  score: number | null
  distance_km: number
}

type RelatedTrip = {
  id: string
  title: string
  cover_image: string | null
  duration_days: number | null
  save_count: number | null
}

export default function LocationPage() {
  const { id } = useParams()
  const router = useRouter()
  const toast = useToast()
  const [location, setLocation] = useState<Location | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null)
  const [savePending, setSavePending] = useState(false)
  const [showVisitPrompt, setShowVisitPrompt] = useState(false)
  const [myVotes, setMyVotes] = useState<Record<string, VoteType>>({})
  const [comments, setComments] = useState<Record<string, CommentWithAuthor[]>>({})
  const [viewer, setViewer] = useState<CommentViewer>(null)
  // locațiile neaprobate sunt vizibile doar celui care le-a adăugat și adminilor
  const [canModerate, setCanModerate] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState<EditableExperience | null>(null)
  const [relatedTrips, setRelatedTrips] = useState<RelatedTrip[]>([])
  const [nearby, setNearby] = useState<NearbyLocation[]>([])
  const [nearbyCovers, setNearbyCovers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<string[]>([])

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()

      const { data: loc, error: locError } = await supabase
        .from('locations')
        .select('*, adder:profiles!added_by(full_name, is_guide)')
        .eq('id', id)
        .maybeSingle()

      // fără asta, o eroare de rețea arăta ca „locația nu există"
      if (locError) setLoadError(true)

      const { data: exps } = await supabase
        .from('experiences')
        .select('*, author:profiles!author_id(id, username, full_name, is_guide)')
        .eq('location_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // userul curent + rolul lui, o singură dată pentru toate firele de comentarii
      const { data: { user } } = await supabase.auth.getUser()
      let isAdmin = false
      if (user) {
        const { data: prof } = await supabase
          .from('profiles').select('role').eq('id', user.id).maybeSingle()
        isAdmin = prof?.role === 'admin'
        setViewer({ id: user.id, isAdmin })

        // în ce listă e locația: „vreau să merg", „am fost", sau în niciuna
        setSaveStatus(await getLocationSaveStatus(supabase, user.id, id as string))
      }

      if (loc) {
        const location = loc as unknown as Location

        if (location.status !== 'approved') {
          const allowed = !!user && (location.added_by === user.id || isAdmin)
          setCanModerate(allowed)
          if (allowed) setLocation(location)
          else setBlocked(true)
        } else {
          setLocation(location)
        }
      }

      if (exps) {
        // votate bine sus, la scor egal cele noi înaintea celor vechi
        const list = (exps as unknown as Experience[]).sort((a, b) => {
          const diff = netScore(b.upvotes, b.downvotes) - netScore(a.upvotes, a.downvotes)
          return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at)
        })
        setExperiences(list)
        const ids = list.map(e => e.id)
        // un singur query pentru comentariile tuturor experiențelor de pe pagină
        const [votes, threads] = await Promise.all([
          fetchMyVotes(supabase, ids),
          fetchCommentsFor(supabase, ids),
        ])
        setMyVotes(votes)
        setComments(threads)
      }

      // călătoriile care trec prin locația asta
      const { data: stops } = await supabase
        .from('trip_locations')
        .select('trip_id')
        .eq('location_id', id)
        .limit(50)

      const tripIds = Array.from(new Set((stops || []).map((s: { trip_id: string }) => s.trip_id)))
      if (tripIds.length > 0) {
        const { data: trips } = await supabase
          .from('trips')
          .select('id, title, cover_image, duration_days, save_count')
          .in('id', tripIds)
          .eq('status', 'active')
          .order('save_count', { ascending: false })
          .limit(6)
        setRelatedTrips((trips || []) as RelatedTrip[])
      }

      // locuri în apropiere — doar dacă știm unde suntem
      const coords = loc as { latitude?: number | null; longitude?: number | null } | null
      if (coords?.latitude != null && coords?.longitude != null) {
        const { data: near } = await supabase.rpc('nearby_locations', {
          p_lat: coords.latitude,
          p_lng: coords.longitude,
          p_radius_km: 10,
          p_exclude_id: id,
          p_limit: 6,
        })
        const places = (near || []) as NearbyLocation[]
        setNearby(places)

        const missing = places.filter(pl => !pl.cover_image).map(pl => pl.id)
        if (missing.length > 0) setNearbyCovers(await fetchLocationCovers(supabase, missing))
      }

      setLoading(false)
    }
    fetch()
  }, [id])

  /**
   * Cele două liste sunt exclusive: apeși pe una activă → o scoate, apeși pe
   * cealaltă → mută locația acolo. Un singur rând în `saves`, oricum.
   */
  const handleSaveStatus = async (next: SaveStatus) => {
    if (savePending) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const target = saveStatus === next ? null : next
    const previous = saveStatus

    setSavePending(true)
    setSaveStatus(target)

    const error = await setLocationSaveStatus(supabase, user.id, id as string, target)
    if (error) {
      setSaveStatus(previous)
      toast('Nu am putut salva. Încearcă din nou.', 'error')
    } else if (target === 'visited') {
      // momentul cu amintirea proaspătă — aici se scriu experiențele
      setShowVisitPrompt(true)
    } else if (target === 'want_to_go') {
      toast('Salvat în profilul tău · Salvate')
    } else {
      toast('Scos din listă')
    }

    setSavePending(false)
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

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  // toate pozele din experiențele locației, în ordinea în care au fost postate
  const galleryImages = experiences.flatMap(exp => exp.images || [])

  const avgRating = (key: 'rating_experience' | 'rating_access' | 'rating_crowd') => {
    const valid = experiences.filter(e => e[key] != null)
    if (!valid.length) return null
    return (valid.reduce((s, e) => s + (e[key] || 0), 0) / valid.length).toFixed(1)
  }

  // de când notarea e opțională, se poate ca nimeni să nu fi dat stele
  const ratedCount = experiences.filter(e => e.rating_experience != null).length
  const hasAnyRating = ['rating_experience', 'rating_access', 'rating_crowd']
    .some(key => avgRating(key as 'rating_experience') !== null)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!location) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      {loadError ? (
        <>
          <div className="text-4xl">📡</div>
          <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Nu am putut încărca locația</p>
          <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">Verifică conexiunea și reîncarcă pagina.</p>
        </>
      ) : blocked ? (
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
        <div className="w-8 flex-shrink-0" />
      </div>

      <div className="max-w-[780px] mx-auto">
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
            ? <CoverImage src={location.cover_image} alt={location.name} priority />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🏔️</div>
          }
          {location.score > 0 && (
            <span className="absolute top-3 right-3 bg-[#E8440A] text-white font-outfit text-sm font-bold px-3 py-1 rounded-full">
              {location.score.toFixed(1)} / 10
            </span>
          )}
          {location.cover_image && location.cover_source === 'google' && (
            <span className="absolute bottom-2 right-3 text-[10px] text-white/85 bg-black/35 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Foto: Google
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
            <button
              onClick={() => handleSaveStatus('want_to_go')}
              disabled={savePending}
              className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
                saveStatus === 'want_to_go'
                  ? 'bg-[#FFF0EB] text-[#E8440A] border border-[rgba(232,68,10,0.2)]'
                  : 'bg-[#E8440A] text-white'
              }`}
            >
              <Bookmark size={15} fill={saveStatus === 'want_to_go' ? '#E8440A' : 'none'} />
              {saveStatus === 'want_to_go' ? 'Salvat' : 'Vreau să merg'}
            </button>

            <button
              onClick={() => handleSaveStatus('visited')}
              disabled={savePending}
              className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
                saveStatus === 'visited'
                  ? 'bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.2)]'
                  : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B]'
              }`}
            >
              <CheckCircle size={15} fill={saveStatus === 'visited' ? '#059669' : 'none'} className={saveStatus === 'visited' ? 'text-white' : ''} />
              Am fost
            </button>

            <ShareButton
              contentType="location"
              contentId={location.id}
              title={location.name}
              className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-sm font-medium rounded-full px-3.5 py-2.5 flex items-center gap-2 flex-shrink-0"
              label=""
            />
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
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed whitespace-pre-line">{location.description}</p>
          </div>
        )}

        {/* Harta — doar dacă știm unde e locul */}
        {location.latitude != null && location.longitude != null && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">Pe hartă</h2>
            <DynamicMap
              markers={[{
                id: location.id,
                lat: location.latitude,
                lng: location.longitude,
                name: location.name,
                subtitle: location.city,
                score: location.score,
              }]}
              height={200}
              showDirections
            />
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
        {experiences.length > 0 && hasAnyRating && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Evaluare medie{' '}
              <span className="text-[12px] font-normal text-[#9B9B9B]">
                din {ratedCount} {ratedCount === 1 ? 'notare' : 'notări'}
              </span>
            </h2>
            {[
              { label: 'Experiență generală', key: 'rating_experience' as const },
              { label: 'Acces și organizare', key: 'rating_access' as const },
              { label: 'Aglomerație', key: 'rating_crowd' as const },
            ].map(({ label, key }) => {
              const avg = avgRating(key)
              const rated = experiences.filter(e => e[key] != null).length
              if (!avg) return null
              return (
                <div key={key} className="flex items-center gap-3 mb-2.5">
                  <span className="text-[13px] text-[#6B6B6B] w-36 md:w-40 flex-shrink-0">
                    {label}
                    <span className="text-[11px] text-[#9B9B9B]"> ({rated})</span>
                  </span>
                  <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E8440A] rounded-full" style={{ width: `${(parseFloat(avg) / 5) * 100}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F0F0F] w-7 text-right">{avg}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Galeria — toate pozele din experiențele locației */}
        {galleryImages.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Galerie{' '}
              <span className="text-[12px] font-normal text-[#9B9B9B]">{galleryImages.length} fotografii</span>
            </h2>
            <PhotoGallery images={galleryImages} />
          </div>
        )}

        {/* Călătorii care trec pe aici */}
        {relatedTrips.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Călătorii care includ această locație
            </h2>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
              {relatedTrips.map(trip => (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="min-w-[180px] max-w-[180px] border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex-shrink-0 hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="relative h-20 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] flex items-center justify-center">
                    {trip.cover_image
                      ? <CoverImage src={trip.cover_image} sizes="180px" />
                      : <span className="text-2xl opacity-50">🧭</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] leading-tight line-clamp-2 mb-1">
                      {trip.title}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B]">
                      {trip.duration_days ? `${trip.duration_days} zile` : 'Itinerar'}
                      {trip.save_count ? ` · ${trip.save_count} salvări` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
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
            experiences.map(exp => {
              const hidden = netScore(exp.upvotes, exp.downvotes) <= HIDE_THRESHOLD_EXPERIENCE
                && !revealed.includes(exp.id)

              if (hidden) return (
                <div key={exp.id} className="mb-3">
                  <HiddenByVotes kind="experience" onShow={() => setRevealed(prev => [...prev, exp.id])} />
                </div>
              )

              return (
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
                        <div className="text-[11px] text-[#9B9B9B]">
                          {timeAgo(exp.created_at)}
                          {formatVisitedPeriod(exp.visited_year, exp.visited_month) && (
                            <span> · a fost în {formatVisitedPeriod(exp.visited_year, exp.visited_month)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    {viewer && exp.author?.id === viewer.id ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setEditing({
                            id: exp.id,
                            content: exp.content,
                            visited_year: exp.visited_year,
                            visited_month: exp.visited_month,
                            rating_experience: exp.rating_experience,
                            rating_access: exp.rating_access,
                            rating_crowd: exp.rating_crowd,
                          })}
                          className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
                        >
                          <Pencil size={11} /> Editează
                        </button>
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Șterge
                        </button>
                      </div>
                    ) : (
                      exp.author?.id && <FollowButton targetUserId={exp.author.id} targetName={exp.author.full_name} size="sm" />
                    )}
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

                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mt-2 whitespace-pre-line">{exp.content}</p>

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
                      <Image key={i} src={img} alt="" width={80} height={80} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-2">
                    <VoteButtons
                      target={{ kind: 'experience', id: exp.id }}
                      upvotes={exp.upvotes}
                      downvotes={exp.downvotes}
                      myVote={myVotes[exp.id] ?? null}
                    />
                    <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                      <MessageCircle size={12} /> {formatCount(exp.comment_count)}
                    </div>
                  </div>
                </div>

                <CommentThread
                  experienceId={exp.id}
                  initialComments={comments[exp.id] || []}
                  viewer={viewer}
                  onCountChange={delta => setExperiences(prev => prev.map(e =>
                    e.id === exp.id ? { ...e, comment_count: Math.max(0, e.comment_count + delta) } : e
                  ))}
                />
              </div>
              )
            })
          )}
        </div>

        {/* În apropiere */}
        {nearby.length > 0 && (
          <div className="px-5 pb-8">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-3">În apropiere</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {nearby.map(place => (
                <Link
                  key={place.id}
                  href={`/location/${place.id}`}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="relative h-20 bg-[#F8F7F5] flex items-center justify-center text-2xl">
                    {place.cover_image || nearbyCovers[place.id]
                      ? <CoverImage src={(place.cover_image || nearbyCovers[place.id]) as string} sizes="(max-width: 768px) 50vw, 240px" />
                      : (CATEGORY_ICONS[place.category || ''] || '📍')}
                    {(place.score || 0) > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-[#E8440A] text-white font-outfit text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                        {place.score?.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] leading-tight truncate">
                      {place.name}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] truncate">{place.city || 'Fără oraș'}</p>
                    <p className="text-[11px] text-[#E8440A] font-medium mt-0.5">
                      {formatDistance(place.distance_km)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showVisitPrompt && (
        <VisitPrompt
          locationId={location.id}
          locationName={location.name}
          onClose={() => setShowVisitPrompt(false)}
        />
      )}

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
