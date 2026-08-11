'use client'
import { createRef, useEffect, useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Bookmark, Calendar, Globe, Loader2, MapPin, Pencil, PenLine, Star, Trash2,
} from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import ShareButton from '@/components/ui/ShareButton'
import FollowButton from '@/components/profile/FollowButton'
import { createClient } from '@/lib/supabase-client'
import { useAuthGate } from '@/components/auth/AuthGate'
import { colorFor, initialsOf } from '@/lib/profiles'
import { formatCount, timeAgo, tripTransports } from '@/lib/utils'
import { linkifyPlaces } from '@/lib/linkify'
import ExpandableText from '@/components/ui/ExpandableText'
import PhotoStack from '@/components/ui/PhotoStack'
import RichText from '@/components/ui/RichText'
import { activityLabel } from '@/lib/activities'
import CoverImage from '@/components/ui/CoverImage'
import TripKindBadge from '@/components/trip/TripKindBadge'
import { useToast } from '@/components/ui/Toast'
import {
  fetchItinerary, groupByDay, isTripSaved, setTripSaved,
  type ItineraryItem, type Trip,
} from '@/lib/trips'

/**
 * Sub atâtea caractere, un text de oprire apare întreg: o notă de două
 * rânduri n-are nevoie de buton. Pragul e mai mic decât pe pagina locului
 * (300), pentru că aici textele stau unul sub altul, în listă.
 */
const STOP_PREVIEW = 200

type StopExperience = {
  id: string
  location_id: string
  content: string
  images: string[] | null
  rating_experience: number | null
  upvotes: number
  comment_count: number
}

type Author = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  is_guide: boolean | null
  role: string | null
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const gate = useAuthGate()
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
  const [stopExperiences, setStopExperiences] = useState<Record<string, StopExperience>>({})

  /**
   * Câte un reper per oprire, creat la cerere. La restrângerea unui text
   * lung ne întoarcem la începutul opririi, nu la mijlocul ei.
   */
  const stopRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({})
  const stopRef = (stopId: string) => {
    stopRefs.current[stopId] = stopRefs.current[stopId] || createRef<HTMLDivElement>()
    return stopRefs.current[stopId]
  }

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
        supabase.from('profiles').select('id, username, full_name, avatar_url, is_guide, role').eq('id', t.author_id).maybeSingle(),
        fetchItinerary(supabase, t.id),
        user ? isTripSaved(supabase, user.id, t.id) : Promise.resolve(false),
      ])

      setAuthor((prof.data as Author) || null)
      setItinerary(stops)
      setSaved(alreadySaved)

      // review-urile autorului la opririle din itinerar — călătoria e,
      // în fond, colecția lor
      const locationIds = stops.map(stop => stop.location?.id).filter(Boolean) as string[]
      if (locationIds.length > 0) {
        const { data: exps } = await supabase
          .from('experiences')
          .select('id, location_id, content, images, rating_experience, upvotes, comment_count')
          .eq('author_id', t.author_id)
          .eq('status', 'active')
          .in('location_id', locationIds)

        const byLocation: Record<string, StopExperience> = {}
        for (const exp of (exps || []) as StopExperience[]) {
          if (!byLocation[exp.location_id]) byLocation[exp.location_id] = exp
        }
        setStopExperiences(byLocation)
      }

      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (savePending || !trip) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { gate('Salvează călătoriile pe care vrei să le ai la îndemână.'); return }

    const next = !saved
    setSavePending(true)
    setSaved(next)
    setSaveCount(c => Math.max(0, c + (next ? 1 : -1)))

    const error = await setTripSaved(supabase, user.id, trip.id, next)
    if (!error) toast(next ? 'Salvat în profilul tău · Salvate' : 'Scoasă din salvate')
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

  const transports = tripTransports(trip)
  // numai opririle cu pin: alea au pagină proprie
  const linkablePlaces = itinerary
    .map(item => item.location)
    .filter((place): place is NonNullable<typeof place> => !!place)
    .map(place => ({ id: place.id, name: place.name }))
  const days = groupByDay(itinerary)

  /** Recenzia autorului la oprirea asta, dacă a scris una. */
  const stopReview = (item: ItineraryItem) =>
    (item.location ? stopExperiences[item.location.id] : null) || null

  /** Pozele opririi: ale recenziei la un loc, ale activității altfel. */
  const stopPhotos = (item: ItineraryItem): string[] =>
    stopReview(item)?.images || item.experience?.images || []

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

      <div className="max-w-[780px] mx-auto">
        <div className="h-52 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] relative overflow-hidden">
          {trip.cover_image
            ? <CoverImage src={trip.cover_image} alt={trip.title} priority />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🧭</div>}
        </div>

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <div className="mb-2">
            <TripKindBadge isGuide={trip.is_guide} className="mb-2" />
            <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F]">{trip.title}</h1>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {trip.duration_days && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <Calendar size={12} /> {trip.duration_days} zile
              </span>
            )}
            {/* transportul e al călătoriei întregi, deci apare o dată, aici,
                lângă durată și țări — nu între opriri, unde ar sugera că
                descrie fiecare segment */}
            {transports.map(t => (
              <span
                key={t.id}
                title={t.label}
                className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1"
              >
                {t.emoji} {t.label}
              </span>
            ))}
            {itinerary.length > 0 && (
              <span className="text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1 flex items-center gap-1.5">
                <MapPin size={12} /> {itinerary.length} opriri
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
            <ShareButton
              contentType="trip"
              contentId={trip.id}
              title={trip.title}
              variant="icon"
              className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
            />
          </div>
        </div>

        {author && (
          <div className="bg-white px-5 py-3 flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.08)]">
            <Link href={`/profile/${author.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
              <Avatar
                id={author.id}
                name={author.full_name || author.username}
                src={author.avatar_url}
                size={36}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#0F0F0F] truncate flex items-center gap-1.5 flex-wrap">
                  {author.full_name || author.username}
                  {author.is_guide && <Star size={11} className="text-[#5B4FCF] fill-[#5B4FCF]" />}
                  {author.role === 'admin' && (
                    <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#EEEDFB] text-[#5B4FCF]">
                      ECHIPA POCOLOCO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#9B9B9B]">{timeAgo(trip.created_at)}</div>
              </div>
            </Link>
            <FollowButton targetUserId={author.id} targetName={author.full_name || author.username} size="sm" />
          </div>
        )}

        {trip.description && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            {/* Opririle numite în poveste devin linkuri spre locurile lor.
                Doar opririle călătoriei: un loc pomenit în treacăt n-are
                pagină garantată. Prima apariție a fiecăruia, ca textul să
                nu devină un covor de linkuri. */}
            <p className="story-text text-[14px] text-[#6B6B6B]">
              {linkifyPlaces(trip.description, linkablePlaces).map((segment, i) =>
                segment.placeId ? (
                  <Link
                    key={i}
                    href={`/location/${segment.placeId}`}
                    className="text-[#5B4FCF] hover:underline"
                  >
                    {segment.text}
                  </Link>
                ) : (
                  // formatarea se aplică peste bucățile rămase: numele
                  // legate sunt deja evidențiate, n-au nevoie de îngroșare
                  <RichText key={i} text={segment.text} />
                )
              )}
            </p>
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
                      // ref-ul e pe oprirea întreagă: la restrângere ne
                      // întoarcem la numele ei, nu la mijlocul textului
                      <div key={item.id} ref={stopRef(item.id)} className="scroll-mt-16">
                        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
                          <div className="p-3.5 pb-3 flex items-start gap-3">
                            <div className="relative w-11 h-11 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.location?.cover_image
                                ? <CoverImage src={item.location.cover_image} sizes="44px" />
                                : item.experience?.images?.[0]
                                  ? <CoverImage src={item.experience.images[0]} sizes="44px" />
                                  : item.experience
                                    ? <span className="text-lg">🪂</span>
                                    : <MapPin size={17} className="text-[#9B9B9B]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* numele opririi e capul de afiș al cardului:
                                  cu zece opriri una sub alta, el e ce se
                                  scanează, nu textul de dedesubt */}
                              {item.location ? (
                                <Link href={`/location/${item.location.id}`} className="font-outfit text-[16px] font-semibold text-[#0F0F0F] hover:text-[#E8440A] transition-colors">
                                  {item.location.name}
                                </Link>
                              ) : item.experience ? (
                                /* oprire de tip activitate: titlul ei ține loc de nume */
                                <Link href={`/experience/${item.experience.id}`} className="font-outfit text-[16px] font-semibold text-[#0F0F0F] hover:text-[#E8440A] transition-colors">
                                  {item.experience.title || 'Activitate'}
                                </Link>
                              ) : (
                                <span className="font-outfit text-[16px] font-semibold text-[#9B9B9B]">Oprire ștearsă</span>
                              )}
                              <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                                {item.experience
                                  ? [activityLabel(item.experience.activity_category), item.experience.activity_area]
                                      .filter(Boolean).join(' · ') || 'Activitate'
                                  : `${item.location?.city || 'Fără oraș'}${item.location?.country ? `, ${item.location.country}` : ''}`}
                              </p>
                              {item.note && (
                                <div className="mt-2 bg-[#F8F7F5] rounded-lg px-2.5 py-1.5">
                                  <ExpandableText
                                    text={item.note}
                                    threshold={STOP_PREVIEW}
                                    lines={3}
                                    className="text-[12px] text-[#6B6B6B] leading-relaxed"
                                    actionClassName="text-[11px] text-[#5B4FCF]"
                                    scrollTo={stopRef(item.id)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Recenzia autorului despre oprirea asta.
                              Antetul — cine a scris și cu ce note — stă pe
                              banda lui, ca pe pagina locului: fără
                              delimitare, primul rând de poveste părea încă
                              un rând de metadate. */}
                          {stopReview(item) && (
                            <div className="px-3.5 pb-3">
                              <div className="border border-[rgba(232,68,10,0.18)] rounded-xl overflow-hidden">
                                <div className="bg-[#FFF1EA] px-2.5 py-1.5 flex items-center gap-1.5">
                                  <PenLine size={11} className="text-[#E8440A] flex-shrink-0" />
                                  <span className="text-[11px] font-outfit font-semibold text-[#E8440A] truncate">
                                    Ce a scris {author?.full_name?.split(' ')[0] || 'autorul'}
                                  </span>
                                  {!!stopReview(item)!.rating_experience && (
                                    <div className="flex gap-0.5 ml-auto flex-shrink-0">
                                      {[1, 2, 3, 4, 5].map(n => (
                                        <Star
                                          key={n}
                                          size={10}
                                          className={n <= (stopReview(item)!.rating_experience || 0)
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-gray-200 fill-gray-200'}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="bg-[#FFFBF9] px-2.5 py-2">
                                  <ExpandableText
                                    text={stopReview(item)!.content}
                                    threshold={STOP_PREVIEW}
                                    lines={3}
                                    className="text-[12px] text-[#6B6B6B] leading-relaxed"
                                    actionClassName="text-[11px] text-[#5B4FCF]"
                                    scrollTo={stopRef(item.id)}
                                    footer={
                                      <Link
                                        href={`/experience/${stopReview(item)!.id}`}
                                        className="text-[11px] text-[#9B9B9B] font-medium mt-1 ml-3 inline-block"
                                      >
                                        Vezi experiența →
                                      </Link>
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* pozele, ca în feed: prima mare, restul dedesubt */}
                          <PhotoStack images={stopPhotos(item)} className="" />
                        </div>

                        {/* doar firul care leagă opririle; transportul nu se
                            repetă aici, pentru că nu știm cum s-a mers de la
                            una la alta */}
                        {i < items.length - 1 && (
                          <div className="py-1.5 pl-[26px]">
                            {/* firul e chiar metafora: călătoria e linia
                                care leagă punctele */}
                            <div className="w-[2px] h-5 rounded-full bg-[rgba(91,79,207,0.45)]" />
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
