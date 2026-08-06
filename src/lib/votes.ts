import type { SupabaseClient } from '@supabase/supabase-js'

export type VoteType = 'up' | 'down'

/** Un vot e ori pe o experiență, ori pe un comentariu — niciodată pe ambele. */
export type VoteTarget =
  | { kind: 'experience'; id: string }
  | { kind: 'comment'; id: string }

const columnFor = (target: VoteTarget) =>
  target.kind === 'experience' ? 'experience_id' : 'comment_id'

/** Voturile userului curent pentru un set de experiențe. */
export async function fetchMyVotes(
  supabase: SupabaseClient,
  experienceIds: string[]
): Promise<Record<string, VoteType>> {
  return fetchMyVotesFor(supabase, 'experience_id', experienceIds)
}

/** Voturile userului curent pentru un set de comentarii. */
export async function fetchMyCommentVotes(
  supabase: SupabaseClient,
  commentIds: string[]
): Promise<Record<string, VoteType>> {
  return fetchMyVotesFor(supabase, 'comment_id', commentIds)
}

async function fetchMyVotesFor(
  supabase: SupabaseClient,
  column: 'experience_id' | 'comment_id',
  targetIds: string[]
): Promise<Record<string, VoteType>> {
  const ids = Array.from(new Set(targetIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('votes')
    .select(`${column}, type`)
    .eq('user_id', user.id)
    .in(column, ids)

  if (error || !data) return {}

  const map: Record<string, VoteType> = {}
  for (const row of data as Record<string, string>[]) {
    const id = row[column]
    if (id) map[id] = row.type as VoteType
  }
  return map
}

/**
 * Aplică un vot: același vot îl anulează, votul opus îl schimbă.
 * Contoarele din DB sunt actualizate de trigger — `delta` e doar pentru
 * update-ul optimist din interfață.
 */
export async function applyVote(
  supabase: SupabaseClient,
  userId: string,
  target: VoteTarget,
  next: VoteType,
  current: VoteType | null
): Promise<{ vote: VoteType | null; upDelta: number; downDelta: number; error: string | null }> {
  // votul rezultat după acțiune: același vot = anulare, altfel schimbare
  const nextVote: VoteType | null = current === next ? null : next
  const delta = (type: VoteType) =>
    (current === type ? -1 : 0) + (nextVote === type ? 1 : 0)

  const column = columnFor(target)
  let error: string | null = null

  if (current === next) {
    const res = await supabase.from('votes').delete().eq('user_id', userId).eq(column, target.id)
    error = res.error?.message ?? null
  } else if (current) {
    const res = await supabase.from('votes').update({ type: next }).eq('user_id', userId).eq(column, target.id)
    error = res.error?.message ?? null
  } else {
    const res = await supabase.from('votes').insert({ user_id: userId, [column]: target.id, type: next })
    error = res.error?.message ?? null
  }

  if (error) return { vote: current, upDelta: 0, downDelta: 0, error }
  return { vote: nextVote, upDelta: delta('up'), downDelta: delta('down'), error: null }
}

/** Praguri peste care conținutul se colapsează, ca să nu fie citit din greșeală. */
export const HIDE_THRESHOLD_EXPERIENCE = -5
export const HIDE_THRESHOLD_COMMENT = -3

export const netScore = (upvotes?: number | null, downvotes?: number | null) =>
  (upvotes || 0) - (downvotes || 0)
