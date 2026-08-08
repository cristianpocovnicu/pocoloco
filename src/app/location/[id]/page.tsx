import Link from 'next/link'
import { MapPin, MessageCircle, Pencil, Route, Star } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import BackButton from '@/components/ui/BackButton'
import ShareButton from '@/components/ui/ShareButton'
import CoverImage from '@/components/ui/CoverImage'
import PhotoGallery from '@/components/location/PhotoGallery'
import SaveActions from '@/components/location/SaveActions'
import ExperienceCard from '@/components/experience/ExperienceCard'
import DynamicMap from '@/components/map/DynamicMap'
import { supabase } from '@/lib/supabase'
import { fetchCommentsFor } from '@/lib/comments'
import { fetchLocationCovers } from '@/lib/covers'
import { ratingLabels } from '@/lib/activities'
import { formatDistance, CATEGORY_ICONS } from '@/lib/utils'
import { getLocationExperiences, getLocationPage, type LocationExperience } from '@/lib/seo'

// pagina unui loc arată doar recenzii de loc: activitățile n-au pin
const LABELS = ratingLabels('place_visit')

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

/**
 * Pagina unui loc — randată pe server.
 *
 * Tot ce se citește vine din HTML: antetul, mediile pe dimensiuni, galeria,
 * recenziile (trunchiate, cu link spre pagina lor), călătoriile care trec
 * pe aici, locurile din jur.
 *
 * Ce ține de cine se uită — butoanele de salvare, votul propriu, editarea,
 * moderarea — stă în insule client care se lămuresc după hidratare.
 * Serverul NU citește cookies: altfel ruta ar fi dinamică și n-ar mai putea
 * fi cachează, adică exact ce voiam de la SSR.
 */
export const revalidate = 300

const initials = (name: string) =>
  name?.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2) || '??'

/** Călătoriile care trec prin locul ăsta. */
async function fetchRelatedTrips(locationId: string): Promise<RelatedTrip[]> {
  const { data: stops } = await supabase
    .from('trip_locations')
    .select('trip_id')
    .eq('location_id', locationId)
    .limit(50)

  const tripIds = Array.from(new Set((stops || []).map((stop: { trip_id: string }) => stop.trip_id)))
  if (tripIds.length === 0) return []

  const { data } = await supabase
    .from('trips')
    .select('id, title, cover_image, duration_days, save_count')
    .in('id', tripIds)
    .eq('status', 'active')
    .order('save_count', { ascending: false })
    .limit(6)

  return (data || []) as RelatedTrip[]
}

/** Locuri în apropiere — doar dacă știm unde suntem. */
async function fetchNearby(id: string, lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return { places: [] as NearbyLocation[], covers: {} as Record<string, string> }

  const { data } = await supabase.rpc('nearby_locations', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: 10,
    p_exclude_id: id,
    p_limit: 6,
  })

  const places = (data || []) as NearbyLocation[]
  const missing = places.filter(place => !place.cover_image).map(place => place.id)
  const covers = missing.length > 0 ? await fetchLocationCovers(supabase, missing) : {}
  return { places, covers }
}

/**
 * Invitația de a scrie. Apare de două ori — înaintea listei și după ea —
 * pentru că cine a citit poveștile până la capăt e exact omul care are una
 * a lui. Aceeași componentă, nu două butoane care se pot despărți.
 *
 * Vizitatorul nelogat ajunge pe ecranul de creare, care îl trimite la
 * login cu `?next=`, ca orice altă acțiune care cere cont.
 */
function WriteCta({ locationId, locationName }: { locationId: string; locationName: string }) {
  return (
    <Link
      href={`/add-experience?location=${locationId}&name=${encodeURIComponent(locationName)}`}
      className="mx-5 my-3 bg-[#5B4FCF] rounded-2xl px-4 py-3.5 flex items-center gap-3"
    >
      <Pencil size={20} className="text-white/80" />
      <span className="font-outfit text-sm font-semibold text-white flex-1">Povestește-ne experiența ta</span>
      <span className="text-white/60">→</span>
    </Link>
  )
}

const average = (rows: LocationExperience[], key: 'rating_experience' | 'rating_access' | 'rating_crowd') => {
  const rated = rows.filter(row => row[key] != null)
  if (rated.length === 0) return null
  return (rated.reduce((sum, row) => sum + (row[key] || 0), 0) / rated.length).toFixed(1)
}

export default async function LocationPage({ params }: { params: { id: string } }) {
  const location = await getLocationPage(params.id)

  /*
   * Locațiile neaprobate n-au pagină publică. Până acum autorul și adminii
   * o vedeau, pentru că pagina citea sesiunea; de la SSR n-o mai citește.
   * Textul lor nu se pierde: fiecare experiență are pagina ei.
   */
  if (!location) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">⏳</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Locația nu e (încă) publică</p>
      <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">
        Ori nu există, ori un administrator încă o verifică. Revino puțin mai târziu.
      </p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  const experiences = await getLocationExperiences(location.id)
  const [comments, relatedTrips, nearby] = await Promise.all([
    fetchCommentsFor(supabase, experiences.map(experience => experience.id)),
    fetchRelatedTrips(location.id),
    fetchNearby(location.id, location.latitude, location.longitude),
  ])

  // toate pozele din experiențele locației, în ordinea în care au fost postate
  const galleryImages = experiences.flatMap(experience => experience.images || [])
  const ratedCount = experiences.filter(experience => experience.rating_experience != null).length

  /**
   * Nota de sus e media notei generale, cu numărul de oameni care au dat-o.
   * Nu are pragul de două note al datelor structurate: acolo o „medie" din
   * una singură ar fi o afirmație către Google, aici e chiar ce spune omul
   * care a fost — și scrie lângă câți sunt.
   */
  const headlineAverage = average(experiences, 'rating_experience')
  const headline = headlineAverage ? { value: parseFloat(headlineAverage), count: ratedCount } : null

  const LEAD = 200
  const first = experiences.find(experience => experience.content.trim())
  const lead = first
    ? (() => {
        const text = first.content.trim()
        return { text: text.slice(0, LEAD).trimEnd(), truncated: text.length > LEAD }
      })()
    : null

  const averages = [
    { label: LABELS.experience, key: 'rating_experience' as const },
    { label: LABELS.access, key: 'rating_access' as const },
    { label: LABELS.crowd, key: 'rating_crowd' as const },
  ]
    .map(row => ({ ...row, value: average(experiences, row.key), rated: experiences.filter(e => e[row.key] != null).length }))
    .filter(row => row.value)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <BackButton />
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate mx-3 flex-1 text-center">
          {location.name}
        </span>
        <div className="w-8 flex-shrink-0" />
      </div>

      <div className="max-w-[780px] mx-auto">
        <div className="h-52 bg-gradient-to-br from-amber-200 to-amber-600 relative overflow-hidden">
          {location.cover_image
            ? <CoverImage src={location.cover_image} alt={location.name} priority />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🏔️</div>}
          {location.cover_image && location.cover_source === 'google' && (
            <span className="absolute bottom-2 right-3 text-[10px] text-white/85 bg-black/35 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Foto: Google
            </span>
          )}
        </div>

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F] mb-1">{location.name}</h1>
          <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1 mb-3">
            <MapPin size={12} /> {location.city}{location.country ? `, ${location.country}` : ''}
          </p>
          <div className="flex gap-2">
            <SaveActions locationId={location.id} locationName={location.name} />
            <ShareButton
              contentType="location"
              contentId={location.id}
              title={location.name}
              className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-sm font-medium rounded-full px-3.5 py-2.5 flex items-center gap-2 flex-shrink-0"
              label=""
            />
          </div>
        </div>

        {location.adder && (
          <div className="bg-white px-5 py-3 flex items-center gap-2 border-b border-[rgba(0,0,0,0.08)]">
            <span className="text-[12px] text-[#9B9B9B]">Adăugat de</span>
            <div className="w-6 h-6 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[10px] font-bold text-white">
              {initials(location.adder.full_name)}
            </div>
            <span className="text-[13px] font-medium text-[#0F0F0F]">{location.adder.full_name}</span>
            {location.adder.is_guide && (
              <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-2 py-0.5 rounded-full font-medium">Ghid Experimentat</span>
            )}
          </div>
        )}

        {location.description && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed whitespace-pre-line">{location.description}</p>
          </div>
        )}

        {/*
          Ce caută omul întâi: cât de bun e locul și ce spune cineva care a
          fost. Amândouă erau mai jos de hartă, adică sub primul ecran pe
          telefon. Blocul e server-rendered, ca restul paginii — deci și
          crawlerul citește textul înaintea hărții.
        */}
        {(headline || lead) && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            {headline && (
              <a href="#experiente" className="flex items-center gap-2 mb-2">
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={15}
                      className={i <= Math.round(headline.value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </span>
                <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">
                  {headline.value.toFixed(1)}
                </span>
                <span className="text-[12px] text-[#9B9B9B]">
                  din {headline.count} {headline.count === 1 ? 'notare' : 'notări'}
                </span>
              </a>
            )}

            {lead && (
              <p className="text-[14px] text-[#0F0F0F] leading-relaxed whitespace-pre-line">
                {lead.text}
                {lead.truncated && '…'}{' '}
                <a href="#experiente" className="text-[13px] text-[#5B4FCF] font-medium whitespace-nowrap">
                  Citește tot →
                </a>
              </p>
            )}
          </div>
        )}

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

        {averages.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Evaluare medie{' '}
              <span className="text-[12px] font-normal text-[#9B9B9B]">
                din {ratedCount} {ratedCount === 1 ? 'notare' : 'notări'}
              </span>
            </h2>
            {averages.map(row => (
              <div key={row.key} className="flex items-center gap-3 mb-2.5">
                <span className="text-[13px] text-[#6B6B6B] w-36 md:w-40 flex-shrink-0">
                  {row.label}
                  <span className="text-[11px] text-[#9B9B9B]"> ({row.rated})</span>
                </span>
                <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E8440A] rounded-full" style={{ width: `${(parseFloat(row.value as string) / 5) * 100}%` }} />
                </div>
                <span className="text-[13px] font-semibold text-[#0F0F0F] w-7 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {galleryImages.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">
              Galerie{' '}
              <span className="text-[12px] font-normal text-[#9B9B9B]">{galleryImages.length} fotografii</span>
            </h2>
            <PhotoGallery images={galleryImages} />
          </div>
        )}

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

        <WriteCta locationId={location.id} locationName={location.name} />

        <div className="px-5 pb-6" id="experiente">
          <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] py-3">
            Experiențe ({experiences.length})
          </h2>

          {experiences.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <p className="text-[14px] text-[#9B9B9B]">Nicio experiență încă. Fii primul!</p>
            </div>
          ) : (
            experiences.map(experience => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                comments={comments[experience.id] || []}
              />
            ))
          )}
        </div>

        {/* a doua plasare: cine a citit până aici are și el o poveste */}
        {experiences.length > 0 && (
          <WriteCta locationId={location.id} locationName={location.name} />
        )}

        {nearby.places.length > 0 && (
          <div className="px-5 pb-8">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-3">În apropiere</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {nearby.places.map(place => (
                <Link
                  key={place.id}
                  href={`/location/${place.id}`}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:border-[rgba(0,0,0,0.15)] transition-colors"
                >
                  <div className="relative h-20 bg-[#F8F7F5] flex items-center justify-center text-2xl">
                    {place.cover_image || nearby.covers[place.id]
                      ? <CoverImage src={(place.cover_image || nearby.covers[place.id]) as string} sizes="(max-width: 768px) 50vw, 240px" />
                      : (CATEGORY_ICONS[place.category || ''] || '📍')}
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

      <BottomNav />
    </main>
  )
}
