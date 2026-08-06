'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Bookmark, Calendar, Globe, Loader2, MapPin, Pencil, Share2, Star, Trash2, Users,
} from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FollowButton from '@/components/profile/FollowButton'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { formatCount, timeAgo, TRANSPORT_TYPES } from '@/lib/utils'
import CoverImage from '@/components/ui/CoverImage'
import { useToast } from '@/components/ui/Toast'
import {
  fetchItinerary, groupByDay, isTripSaved, setTripSaved,
  type ItineraryItem, type Trip,
} from '@/lib/trips'

type Author = {
  id: string
  username: string | null
  full_name: string | null
  is_guide: boolean | null
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [saved, setSaved] = useState(false)
  const [saveCount, setSaveCount] = useState(0)
  const [savePending, setSavePending] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle()

      // eroarea de rețea nu înseamnă că nu există călătoria
      if (error) setLoadError(true)
      if (!data) { setLoading(false); return }
      const t = data as Trip
      setTrip(t)
      setSaveCount(t.save_count || 0)

      const { data: { user } } = await supabase.auth.getUser()
      setIsOwner(!!user && user.id === t.author_id)

      const [prof, stops, alreadySaved] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, is_guide').eq('id', t.author_id).maybeSingle(),
        fetchItinerary(supabase, t.id),
        user ? isTripSaved(supabase, user.id, t.id) : Promise.resolve(false),
      ])

      setAuthor((prof.data as Author) || null)
      setItinerary(stops)
      setSaved(alreadySaved)
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (savePending || !trip) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const next = !saved
    setSavePending(true)
    setSaved(next)
    setSaveCount(c => Math.max(0, c + (next ? 1 : -1)))

    const error = await setTripSaved(supabase, user.id, trip.id, next)
    if (!error) toast(next ? 'Călătorie salvată' : 'Scoasă din salvate')
    if (error) {
      setSaved(!next)
      setSaveCount(c => Math.max(0, c + (next ? -1 : 1)))
    }
    setSavePending(false)
  }

  const handleDelete = async () => {
    if (!trip || !window.confirm('Ștergi călătoria? Itinerarul dispare odată cu ea.')) return
    const supabase = createClient()
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (!error) router.push('/trips')
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: trip?.title, url }) } catch { /* anulat de user */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* clipboard blocat */ }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!trip || trip.status === 'removed') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">{loadError ? '📡' : '🧭'}</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">
        {loadError ? 'Nu am putut încărca călătoria' : 'Călătoria nu a fost găsită'}
      </p>
      {loadError && <p className="text-[13px] text-[#6B6B6B]">Verifică conexiunea și reîncarcă pagina.</p>}
      <Link href="/trips" className="text-[#E8440A] font-medium">← Vezi toate călătoriile</Link>
    </div>
  )

  const transport = TRANSPORT_TYPES.find(t => t.id === trip.transport_type)
  const days = groupByDay(itinerary)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate flex-1">{trip.title}</span>
        {isOwner && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/trip/${trip.id}/edit`}
              className="text-[12px] bg-[#EEEDFB] text-[#5B4FCF] font-outfit font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Pencil size={12} /> Editează
            </Link>
            <button onClick={handleDelete} className="w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center" aria-label="Șterge călătoria">
              <Trash2 size={15} className="text-[#DC2626]" />
            </button>
          </div>
        )}
      </div>

      <div className="max-w-[680px] mx-auto">
        <div className="h-52 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] relative overflow-hidden">
          {trip.cover_image
            ? <CoverImage src={trip.cover_image} alt={trip.title} priority />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🧭</div>}
        </div>

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F] mb-2">{trip.title}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
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
            {itinerary.length > 0 && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <MapPin size={12} /> {itinerary.length} opriri
              </span>
            )}
            {trip.person_count && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Users size={12} /> {trip.person_count} persoane
              </span>
            )}
            {trip.countries && trip.countries.length > 0 && (
              <span className="text-[12px] text-[#5B4FCF] bg-[#EEEDFB] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Globe size={12} /> {trip.countries.join(', ')}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={savePending}
              className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
                saved
                  ? 'bg-[#FFF0EB] text-[#E8440A] border border-[rgba(232,68,10,0.2)]'
                  : 'bg-[#E8440A] text-white'
              }`}
            >
              <Bookmark size={15} fill={saved ? '#E8440A' : 'none'} />
              {saved ? 'Salvată' : 'Salvează călătoria'}
              {saveCount > 0 && <span className="opacity-70">· {formatCount(saveCount)}</span>}
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
              aria-label="Distribuie"
            >
              <Share2 size={16} className="text-[#6B6B6B]" />
            </button>
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
            <FollowButton targetUserId={author.id} targetName={author.full_name || author.username} size="sm" />
          </div>
        )}

        {trip.description && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed whitespace-pre-line">{trip.description}</p>
          </div>
        )}

        {/* Itinerar */}
        <div className="px-5 py-4">
          <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-3">
            Itinerar {days.length > 0 && <span className="text-[13px] font-normal text-[#9B9B9B]">· {days.length} {days.length === 1 ? 'zi' : 'zile'}</span>}
          </h2>

          {days.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl py-10 text-center">
              <p className="text-[13px] text-[#9B9B9B]">Călătoria asta n-are încă un itinerar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {days.map(({ day, items }) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="bg-[#5B4FCF] text-white font-outfit text-[12px] font-bold px-3 py-1 rounded-full">
                      Ziua {day}
                    </span>
                    <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                  </div>

                  <div className="flex flex-col">
                    {items.map((item, i) => (
                      <div key={item.id}>
                        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex items-start gap-3">
                          <div className="relative w-11 h-11 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.location?.cover_image
                              ? <CoverImage src={item.location.cover_image} sizes="44px" />
                              : <MapPin size={17} className="text-[#9B9B9B]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.location ? (
                              <Link href={`/location/${item.location.id}`} className="font-outfit text-[14px] font-semibold text-[#0F0F0F] hover:text-[#E8440A] transition-colors">
                                {item.location.name}
                              </Link>
                            ) : (
                              <span className="font-outfit text-[14px] font-semibold text-[#9B9B9B]">Locație ștearsă</span>
                            )}
                            <p className="text-[11px] text-[#9B9B9B]">
                              {item.location?.city || 'Fără oraș'}
                              {item.location?.country ? `, ${item.location.country}` : ''}
                            </p>
                            {item.note && (
                              <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-1.5 bg-[#F8F7F5] rounded-lg px-2.5 py-1.5">
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* conector de transport între opriri */}
                        {i < items.length - 1 && (
                          <div className="flex items-center gap-2 py-1.5 pl-[26px]">
                            <div className="w-px h-5 bg-[rgba(0,0,0,0.12)]" />
                            <span className="text-[11px] text-[#9B9B9B] flex items-center gap-1">
                              {transport?.emoji || '→'} {transport?.label || 'mai departe'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
