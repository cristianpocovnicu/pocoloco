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

export const getExperienceSeo = cache(async (id: string) => {
  const { data } = await supabase
    .from('experiences')
    .select(`
      id, kind, title, content, images, activity_area, created_at, status,
      rating_experience, visited_year,
      author:profiles!author_id(username, full_name),
      location:locations!location_id(id, name, city, country, status)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!data || data.status !== 'active') return null

  const row = data as unknown as ExperienceSeo
  // o experiență legată de un loc neaprobat nu se arată nicăieri altundeva:
  // nici aici n-are ce căuta
  if (row.location && row.location.status !== 'approved') return null
  return row
})

export type ExperienceSeo = {
  id: string
  kind: string | null
  title: string | null
  content: string | null
  images: string[] | null
  activity_area: string | null
  created_at: string
  status: string
  rating_experience: number | null
  visited_year: number | null
  author: { username: string | null; full_name: string | null } | null
  location: { id: string; name: string; city: string | null; country: string | null; status: string } | null
}

/** Recenziile unui loc, pentru `review[]` și media din JSON-LD. */
export const getLocationReviews = cache(async (locationId: string) => {
  const { data } = await supabase
    .from('experiences')
    .select('id, content, rating_experience, created_at, author:profiles!author_id(full_name, username)')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []) as unknown as {
    id: string
    content: string | null
    rating_experience: number | null
    created_at: string
    author: { full_name: string | null; username: string | null } | null
  }[]
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
