import type { SupabaseClient } from '@supabase/supabase-js'

export type Badge = {
  id: string
  name: string
  description: string
  emoji: string
  condition_type: 'experiences' | 'trips' | 'followers' | 'following' | 'guide'
  condition_value: number
  sort_order: number
}

export type EarnedBadge = Badge & { earned_at: string }

/**
 * Insignele unui user: cele câștigate și cele rămase de câștigat.
 * Le arătăm și pe cele blocate, ca profilul să spună ce urmează.
 */
export async function fetchBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<{ earned: EarnedBadge[]; locked: Badge[] }> {
  const [catalogRes, ownedRes] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order', { ascending: true }),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId),
  ])

  if (catalogRes.error) return { earned: [], locked: [] }

  const catalog = (catalogRes.data || []) as Badge[]
  const earnedAt: Record<string, string> = {}
  for (const row of (ownedRes.data || []) as { badge_id: string; earned_at: string }[]) {
    earnedAt[row.badge_id] = row.earned_at
  }

  return {
    earned: catalog
      .filter(b => earnedAt[b.id])
      .map(b => ({ ...b, earned_at: earnedAt[b.id] })),
    locked: catalog.filter(b => !earnedAt[b.id]),
  }
}
