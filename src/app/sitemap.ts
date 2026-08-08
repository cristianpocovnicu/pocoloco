import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'

/**
 * Sitemap-ul se reface o dată pe oră. Conținutul nou apare oricum în feed
 * imediat; aici contează doar ca botul să nu ceară baza la fiecare vizită.
 */
export const revalidate = 3600

/** Cât cerem dintr-o dată — PostgREST nu întoarce mai mult oricum. */
const PAGE = 1000
/** Plafon de siguranță: un sitemap are voie cu 50.000 de URL-uri. */
const MAX = 10000

/**
 * PostgREST întoarce maximum ~1000 de rânduri pe cerere, în tăcere. Fără
 * paginare, sitemap-ul ar părea complet și ar tăia restul site-ului din
 * index fără niciun semn.
 */
async function fetchAll<T>(
  table: string,
  columns: string,
  refine: (query: ReturnType<typeof buildQuery>) => ReturnType<typeof buildQuery>
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await refine(buildQuery(table, columns)).range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...(data as unknown as T[]))
    if (data.length < PAGE) break
  }

  return rows
}

function buildQuery(table: string, columns: string) {
  return supabase.from(table).select(columns).order('created_at', { ascending: false })
}

type Row = { created_at: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locations, trips, experiences, profiles] = await Promise.all([
    fetchAll<Row & { id: string }>(
      'locations', 'id, created_at', q => q.eq('status', 'approved')
    ),
    fetchAll<Row & { id: string }>(
      'trips', 'id, created_at', q => q.eq('status', 'active')
    ),
    // aceeași regulă ca în feed: o experiență dintr-un loc neaprobat nu se
    // arată nicăieri, deci nu se trimite nici la indexat
    fetchAll<Row & { id: string; kind: string | null; location: { status: string } | null }>(
      'experiences',
      'id, kind, created_at, location:locations!location_id(status)',
      q => q.eq('status', 'active')
    ),
    fetchAll<Row & { username: string | null }>(
      'profiles', 'username, created_at', q => q.not('username', 'is', null)
    ),
  ])

  /**
   * O dată lipsă sau stricată nu are voie să dărâme tot sitemap-ul:
   * `toISOString()` pe un `Invalid Date` aruncă, iar ruta ar întoarce 500
   * pentru toate URL-urile din cauza unui singur rând. Atunci intrarea
   * merge fără `lastModified` — e un câmp opțional.
   */
  const stamp = (value?: string | null) => {
    if (!value) return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/trips`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/termeni`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/confidentialitate`, changeFrequency: 'yearly', priority: 0.1 },
  ]

  return [
    ...staticPages,
    ...locations.map(row => ({
      url: `${SITE_URL}/location/${row.id}`,
      // `lastModified` e data creării: niciuna dintre tabelele de conținut
      // n-are `updated_at`. O editare nu se vede aici până nu apare coloana.
      lastModified: stamp(row.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...trips.map(row => ({
      url: `${SITE_URL}/trip/${row.id}`,
      lastModified: stamp(row.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...experiences
      .filter(row => row.kind === 'activity' || row.location?.status === 'approved')
      .map(row => ({
        url: `${SITE_URL}/experience/${row.id}`,
        lastModified: stamp(row.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ...profiles
      .filter(row => row.username)
      .map(row => ({
        url: `${SITE_URL}/profile/${row.username}`,
        lastModified: stamp(row.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
  ]
}
