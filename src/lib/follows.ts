import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfilesMap, type MiniProfile } from './profiles'

export type FollowCounts = { followers: number; following: number }

/** Câți îl urmăresc și pe câți urmărește userul dat. */
export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowCounts> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  }
}

/** Id-urile userilor pe care îi urmărește userul dat. */
export async function fetchFollowingIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
  return (data || []).map((r: { following_id: string }) => r.following_id)
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  targetId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', targetId)
    .maybeSingle()
  return !!data
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
  /** doar pentru călătorii */
  title?: string
  cover_image?: string | null
  countries?: string[]
  duration_days?: number | null
  href: string
}

type ExperienceRow = {
  id: string
  content: string | null
  images: string[] | null
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
  created_at: string
  author_id: string
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
    .select('id, content, images, created_at, author_id, location:locations!location_id!inner(id, name, city, status)')
    .in('author_id', authorIds)
    .eq('status', 'active')
    .eq('location.status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)

  let tripQuery = supabase
    .from('trips')
    .select('id, title, description, cover_image, countries, duration_days, created_at, author_id')
    .in('author_id', authorIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    experienceQuery = experienceQuery.lt('created_at', before)
    tripQuery = tripQuery.lt('created_at', before)
  }

  const [experiencesRes, tripsRes] = await Promise.all([experienceQuery, tripQuery])

  const experiences = (experiencesRes.data || []) as unknown as ExperienceRow[]
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
      href: e.location ? `/location/${e.location.id}` : '#',
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
