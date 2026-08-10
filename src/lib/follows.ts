import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfilesMap, type MiniProfile } from './profiles'

export type FollowCounts = { followers: number; following: number }

/**
 * Câți îl urmăresc și pe câți urmărește userul dat.
 *
 * Numărăm cu select('*') pentru că tabelul follows nu are neapărat o
 * coloană `id` (cheia poate fi perechea follower/following) — un
 * select('id') pe un tabel fără coloana asta întoarce 400.
 * Orice eroare degradează la 0, ca să nu pice pagina din cauza contorului.
 */
export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowCounts> {
  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    return {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    }
  } catch {
    return { followers: 0, following: 0 }
  }
}

/** Id-urile userilor pe care îi urmărește userul dat. */
export async function fetchFollowingIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    if (error) return []
    return (data || []).map((r: { following_id: string }) => r.following_id)
  } catch {
    return []
  }
}

export type FollowListKind = 'followers' | 'following'

export type FollowListUser = MiniProfile & {
  is_guide: boolean | null
  bio: string | null
}

/**
 * Cine urmărește pe cine, ca listă de oameni.
 *
 * Publică pentru oricine, inclusiv nelogat: politica `follows_select_all`
 * (migrarea 4) e `using (true)`, iar profilurile sunt oricum publice.
 *
 * Două cereri, nu un join: `follows` n-are cheie străină declarată spre
 * `profiles`, deci PostgREST n-ar putea atașa relația — aceeași soluție
 * ca peste tot unde apare perechea asta.
 */
export async function fetchFollowList(
  supabase: SupabaseClient,
  userId: string,
  kind: FollowListKind,
  limit = 200
): Promise<FollowListUser[]> {
  try {
    // urmăritori: cine mă are pe mine ca țintă; urmăriți: invers
    const [column, target] = kind === 'followers'
      ? ['following_id', 'follower_id']
      : ['follower_id', 'following_id']

    const { data, error } = await supabase
      .from('follows')
      .select(target)
      .eq(column, userId)
      .limit(limit)

    if (error || !data) return []

    const ids = (data as unknown as Record<string, string>[])
      .map(row => row[target])
      .filter(Boolean)
    if (ids.length === 0) return []

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_guide, bio')
      .in('id', ids)

    return (profiles || []) as FollowListUser[]
  } catch {
    return []
  }
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  targetId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
    if (error) return false
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

/** Urmărește / nu mai urmări. Întoarce mesajul de eroare sau null. */
export async function setFollow(
  supabase: SupabaseClient,
  followerId: string,
  targetId: string,
  follow: boolean
): Promise<string | null> {
  if (followerId === targetId) return 'Nu te poți urmări pe tine.'

  if (follow) {
    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: targetId,
    })
    return error?.message ?? null
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', targetId)
  return error?.message ?? null
}

// ---------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------

export type FeedItem = {
  kind: 'experience' | 'trip'
  id: string
  created_at: string
  text: string
  images: string[]
  author: MiniProfile | null
  /** doar pentru experiențe */
  location?: { id: string; name: string; city: string | null } | null
  /** completate doar la experiențele de tip activitate */
  activityTitle?: string | null
  activityCategory?: string | null
  activityArea?: string | null
  /** doar pentru călătorii */
  title?: string
  cover_image?: string | null
  countries?: string[]
  duration_days?: number | null
  isGuide?: boolean | null
  saveCount?: number
  /** doar pentru experiențe: votes și comments n-au trip_id */
  upvotes?: number
  downvotes?: number
  commentCount?: number
  href: string
}

type ExperienceRow = {
  id: string
  kind?: string | null
  title?: string | null
  activity_category?: string | null
  activity_area?: string | null
  content: string | null
  images: string[] | null
  upvotes: number | null
  downvotes: number | null
  comment_count: number | null
  created_at: string
  author_id: string
  location: { id: string; name: string; city: string | null; status: string } | null
}

type TripRow = {
  id: string
  title: string
  description: string | null
  cover_image: string | null
  countries: string[] | null
  duration_days: number | null
  save_count: number | null
  created_at: string
  author_id: string
  is_guide: boolean | null
}

/**
 * Postările userilor urmăriți — experiențe + călătorii, amestecate
 * cronologic. Paginare prin cursor pe created_at (`before`), aplicat
 * peste ambele tabele, ca să nu sară nimic între pagini.
 */
export async function fetchFollowingFeed(
  supabase: SupabaseClient,
  authorIds: string[],
  { before, limit = 10 }: { before?: string; limit?: number } = {}
): Promise<FeedItem[]> {
  if (authorIds.length === 0) return []

  let experienceQuery = supabase
    .from('experiences')
    .select('id, kind, title, activity_category, activity_area, content, images, upvotes, downvotes, comment_count, created_at, author_id, location:locations!location_id(id, name, city, status)')
    .in('author_id', authorIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  let tripQuery = supabase
    .from('trips')
    .select('id, title, description, cover_image, countries, duration_days, save_count, created_at, author_id, is_guide')
    .in('author_id', authorIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    experienceQuery = experienceQuery.lt('created_at', before)
    tripQuery = tripQuery.lt('created_at', before)
  }

  const [experiencesRes, tripsRes] = await Promise.all([experienceQuery, tripQuery])

  // join stâng: activitățile n-au locație, dar au ce căuta în feed.
  // Experiențele legate de un loc neaprobat le filtrăm aici.
  const experiences = ((experiencesRes.data || []) as unknown as ExperienceRow[])
    .filter(e => e.kind === 'activity' || e.location?.status === 'approved')
  // tabelul trips poate lipsi / poate fi gol — nu blocăm feedul pentru asta
  const trips = (tripsRes.error ? [] : (tripsRes.data || [])) as unknown as TripRow[]

  const authors = await fetchProfilesMap(supabase, [
    ...experiences.map(e => e.author_id),
    ...trips.map(t => t.author_id),
  ])

  const items: FeedItem[] = [
    ...experiences.map(e => ({
      kind: 'experience' as const,
      id: e.id,
      created_at: e.created_at,
      text: e.content || '',
      images: e.images || [],
      author: authors[e.author_id] || null,
      location: e.location,
      activityTitle: e.kind === 'activity' ? e.title ?? null : null,
      activityCategory: e.kind === 'activity' ? e.activity_category ?? null : null,
      activityArea: e.kind === 'activity' ? e.activity_area ?? null : null,
      upvotes: e.upvotes ?? 0,
      downvotes: e.downvotes ?? 0,
      commentCount: e.comment_count ?? 0,
      href: e.location ? `/location/${e.location.id}` : `/experience/${e.id}`,
    })),
    ...trips.map(t => ({
      kind: 'trip' as const,
      id: t.id,
      created_at: t.created_at,
      text: t.description || '',
      images: t.cover_image ? [t.cover_image] : [],
      author: authors[t.author_id] || null,
      title: t.title,
      cover_image: t.cover_image,
      countries: t.countries || [],
      duration_days: t.duration_days,
      isGuide: t.is_guide,
      saveCount: t.save_count ?? 0,
      href: `/trip/${t.id}`,
    })),
  ]

  items.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return items.slice(0, limit)
}

// ---------------------------------------------------------------------
// Sugestii
// ---------------------------------------------------------------------

export type SuggestedUser = MiniProfile & {
  is_guide: boolean | null
  bio: string | null
  experienceCount: number
}

/**
 * Userii cu cele mai multe experiențe publicate, mai puțin cei excluși
 * (tu însuți și cei pe care îi urmărești deja).
 */
export async function fetchSuggestedUsers(
  supabase: SupabaseClient,
  excludeIds: string[],
  limit = 6
): Promise<SuggestedUser[]> {
  const { data } = await supabase
    .from('experiences')
    .select('author_id')
    .eq('status', 'active')
    .limit(2000)

  const excluded = new Set(excludeIds.filter(Boolean))
  const tally: Record<string, number> = {}
  for (const row of (data || []) as { author_id: string }[]) {
    if (!row.author_id || excluded.has(row.author_id)) continue
    tally[row.author_id] = (tally[row.author_id] || 0) + 1
  }

  const topIds = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_guide, bio')
    .in('id', topIds)

  return ((profiles || []) as (MiniProfile & { is_guide: boolean | null; bio: string | null })[])
    .map(p => ({ ...p, experienceCount: tally[p.id] || 0 }))
    .sort((a, b) => b.experienceCount - a.experienceCount)
}
