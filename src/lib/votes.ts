import type { SupabaseClient } from '@supabase/supabase-js'

export type VoteType = 'up' | 'down'

/** Votul userului curent pentru fiecare experiență din listă. */
export async function fetchMyVotes(
  supabase: SupabaseClient,
  experienceIds: string[]
): Promise<Record<string, VoteType>> {
  const ids = Array.from(new Set(experienceIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data } = await supabase
    .from('votes')
    .select('experience_id, type')
    .eq('user_id', user.id)
    .in('experience_id', ids)

  const map: Record<string, VoteType> = {}
  for (const v of (data || []) as { experience_id: string; type: VoteType }[]) {
    map[v.experience_id] = v.type
  }
  return map
}

/**
 * Aplică un vot: același vot îl anulează, votul opus îl schimbă.
 * Contoarele din experiences sunt actualizate de trigger în DB —
 * `delta` e doar pentru update-ul optimist din interfață.
 */
export async function applyVote(
  supabase: SupabaseClient,
  userId: string,
  experienceId: string,
  next: VoteType,
  current: VoteType | null
): Promise<{ vote: VoteType | null; upDelta: number; downDelta: number; error: string | null }> {
  // votul rezultat după acțiune: același vot = anulare, altfel schimbare
  const nextVote: VoteType | null = current === next ? null : next
  const delta = (type: VoteType) =>
    (current === type ? -1 : 0) + (nextVote === type ? 1 : 0)

  let error: string | null = null

  if (current === next) {
    const res = await supabase.from('votes').delete().eq('user_id', userId).eq('experience_id', experienceId)
    error = res.error?.message ?? null
  } else if (current) {
    const res = await supabase.from('votes').update({ type: next }).eq('user_id', userId).eq('experience_id', experienceId)
    error = res.error?.message ?? null
  } else {
    const res = await supabase.from('votes').insert({ user_id: userId, experience_id: experienceId, type: next })
    error = res.error?.message ?? null
  }

  if (error) return { vote: current, upDelta: 0, downDelta: 0, error }
  return { vote: nextVote, upDelta: delta('up'), downDelta: delta('down'), error: null }
}
