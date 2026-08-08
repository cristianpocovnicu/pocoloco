import { cache } from 'react'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

export const SITE_URL = 'https://pocoloco.travel'

/**
 * Rutele care n-au ce căuta într-un index.
 *
 * Două feluri: cele private (ale userului sau ale echipei) și cele
 * generate — rezultatele de căutare sunt conținut subțire și duplicat,
 * exact ce descurajează Google să indexeze.
 *
 * Lista e folosită și de robots.ts, ca să nu se despartă de meta-taguri.
 */
export const PRIVATE_PREFIXES = [
  '/admin',
  '/settings',
  '/notifications',
  '/points',
  '/add-experience',
  '/onboarding',
  '/following',
  '/login',
  '/register',
  '/search',
  '/auth',
]

/**
 * Căi închise exact, nu ca prefix.
 *
 * `/profile` e propriul profil și n-are ce indexa, dar `/profile/<username>`
 * e o pagină publică: un `Disallow: /profile` le-ar fi tăiat pe amândouă,
 * pentru că robots.txt se potrivește pe prefix. De aici `$`.
 */
export const PRIVATE_EXACT = ['/profile$', '/trip/*/edit$']

/** Meta pentru paginile care nu se indexează. */
export const noIndex: Metadata = {
  robots: { index: false, follow: true },
}

/**
 * `cache()` din React ține răspunsul pe durata unei cereri: `generateMetadata`
 * și corpul layout-ului cer aceleași date, dar baza e întrebată o dată.
 * Fără el, fiecare pagină ar face două query-uri identice.
 */
export const getLocationSeo = cache(async (id: string) => {
  const { data } = await supabase
    .from('locations')
    .select('id, name, city, country, description, cover_image, experience_count, latitude, longitude, category, status')
    .eq('id', id)
    .maybeSingle()

  return data && data.status === 'approved' ? data : null
})

export const getTripSeo = cache(async (id: string) => {
  const { data } = await supabase
    .from('trips')
    .select('id, title, description, cover_image, duration_days, countries, created_at, status')
    .eq('id', id)
    .maybeSingle()

  return data && data.status === 'active' ? data : null
})

/**
 * Experiența, cu tot ce randează pagina ei.
 *
 * Se oprește la `status = 'active'`: fără cookies pe server nu putem ști
 * dacă cel care cere e autorul, iar o citire cu sesiune ar face ruta
 * dinamică și ar arunca cache-ul. Ce nu e activ nu se randează.
 */
export const getExperienceSeo = cache(async (id: string) => {
  const { data } = await supabase
    .from('experiences')
    .select(`
      id, kind, title, activity_category, activity_area, content, images, tips,
      rating_experience, rating_access, rating_crowd, visited_year, visited_month,
      upvotes, downvotes, comment_count, created_at, status, author_id, location_id,
      author:profiles!author_id(id, username, full_name, is_guide),
      location:locations!location_id(id, name, city, country, status)
    `)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!data) return null
  return data as unknown as ExperienceSeo
})

/**
 * O experiență la un loc neaprobat rămâne vizibilă omului care are linkul —
 * e a lui —, dar n-are ce căuta într-un index: locul din spatele ei încă nu
 * e public. Diferența se rezolvă cu `noindex`, nu ascunzând pagina.
 */
export function isIndexable(experience: ExperienceSeo) {
  return !experience.location || experience.location.status === 'approved'
}

export type ExperienceSeo = {
  id: string
  kind: 'place_visit' | 'activity'
  title: string | null
  activity_category: string | null
  activity_area: string | null
  content: string
  images: string[] | null
  tips: string[] | null
  rating_experience: number | null
  rating_access: number | null
  rating_crowd: number | null
  visited_year: number | null
  visited_month: number | null
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  status: string
  author_id: string
  location_id: string | null
  author: { id: string; username: string | null; full_name: string | null; is_guide: boolean | null } | null
  location: { id: string; name: string; city: string | null; country: string | null; status: string } | null
}

export type LocationExperience = {
  id: string
  content: string
  images: string[] | null
  tips: string[] | null
  visited_year: number | null
  visited_month: number | null
  rating_experience: number | null
  rating_access: number | null
  rating_crowd: number | null
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author: { id: string; username: string | null; full_name: string | null; is_guide: boolean | null } | null
}

/**
 * Locul, cu cine l-a adăugat. Doar aprobate: restul n-au pagină publică.
 */
export const getLocationPage = cache(async (id: string) => {
  const { data } = await supabase
    .from('locations')
    .select('*, adder:profiles!added_by(full_name, is_guide)')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()

  return (data as unknown as LocationPage | null) || null
})

export type LocationPage = {
  id: string
  name: string
  city: string
  country: string
  description: string | null
  cover_image: string | null
  cover_source?: string | null
  latitude: number | null
  longitude: number | null
  score: number
  experience_count: number
  trip_count: number
  status: string
  added_by: string
  adder?: { full_name: string; is_guide: boolean } | null
}

/** Experiențele locului, votate bine sus — aceeași ordine ca înainte. */
export const getLocationExperiences = cache(async (locationId: string) => {
  const { data } = await supabase
    .from('experiences')
    .select('*, author:profiles!author_id(id, username, full_name, is_guide)')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const rows = (data || []) as unknown as LocationExperience[]
  return rows.sort((a, b) => {
    const diff = (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
    return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at)
  })
})

/** Recenziile unui loc, pentru datele structurate: aceeași listă, scurtată. */
export const getLocationReviews = cache(async (locationId: string) => {
  const rows = await getLocationExperiences(locationId)
  return rows.slice(0, 20)
})

/**
 * Media notei generale, cu prag.
 *
 * Sub două note, o „medie" e părerea unui singur om îmbrăcată în
 * statistică — n-o publicăm ca `aggregateRating`. Rotunjirea la 0,1 e
 * aceeași convenție ca cea decisă pentru agregarea de mai târziu.
 */
export function averageRating(values: (number | null)[]) {
  const rated = values.filter((v): v is number => typeof v === 'number' && v > 0)
  if (rated.length < 2) return null

  const mean = rated.reduce((sum, v) => sum + v, 0) / rated.length
  return { value: Math.round(mean * 10) / 10, count: rated.length }
}

/** Primele ~150 de caractere, tăiate la cuvânt. */
export function excerpt(text: string | null | undefined, max = 150) {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
