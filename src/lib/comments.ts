import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfilesMap, type MiniProfile } from './profiles'

export type CommentWithAuthor = {
  id: string
  experience_id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string | null
  upvotes: number
  downvotes: number
  author: MiniProfile | null
}

/** Un comentariu de nivel 1 împreună cu răspunsurile lui (nivel 2). */
export type CommentNode = CommentWithAuthor & { replies: CommentWithAuthor[] }

/**
 * Comentariile pentru mai multe experiențe deodată, grupate pe experiență.
 * Pagina locației le aduce dintr-un singur query, nu câte unul per card.
 */
export async function fetchCommentsFor(
  supabase: SupabaseClient,
  experienceIds: string[]
): Promise<Record<string, CommentWithAuthor[]>> {
  const ids = Array.from(new Set(experienceIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('comments')
    .select('id, experience_id, author_id, parent_id, content, created_at, updated_at, upvotes, downvotes')
    .in('experience_id', ids)
    .order('created_at', { ascending: true })

  if (error) return {}

  const rows = (data || []) as Omit<CommentWithAuthor, 'author'>[]
  const authors = await fetchProfilesMap(supabase, rows.map(r => r.author_id))

  const grouped: Record<string, CommentWithAuthor[]> = {}
  for (const id of ids) grouped[id] = []
  for (const row of rows) {
    ;(grouped[row.experience_id] ||= []).push({ ...row, author: authors[row.author_id] || null })
  }
  return grouped
}

/**
 * Transformă lista plată în thread de maximum 2 nivele.
 * Un răspuns al cărui părinte nu mai există devine comentariu de nivel 1.
 */
export function buildThread(comments: CommentWithAuthor[]): CommentNode[] {
  const byId = new Set(comments.map(c => c.id))
  const roots: CommentNode[] = []
  const repliesByParent: Record<string, CommentWithAuthor[]> = {}

  for (const c of comments) {
    if (c.parent_id && byId.has(c.parent_id)) {
      ;(repliesByParent[c.parent_id] ||= []).push(c)
    } else {
      roots.push({ ...c, replies: [] })
    }
  }

  for (const root of roots) {
    root.replies = (repliesByParent[root.id] || []).sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    )
  }

  return roots.sort((a, b) => {
    const diff = ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0))
    return diff !== 0 ? diff : a.created_at.localeCompare(b.created_at)
  })
}

export async function addComment(
  supabase: SupabaseClient,
  input: { experienceId: string; authorId: string; parentId: string | null; content: string }
): Promise<{ comment: CommentWithAuthor | null; error: string | null }> {
  const content = input.content.trim()
  if (!content) return { comment: null, error: 'Comentariul e gol.' }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      experience_id: input.experienceId,
      author_id: input.authorId,
      parent_id: input.parentId,
      content,
    })
    .select('id, experience_id, author_id, parent_id, content, created_at, updated_at, upvotes, downvotes')
    .single()

  if (error || !data) return { comment: null, error: error?.message ?? 'Nu am putut salva comentariul.' }

  const authors = await fetchProfilesMap(supabase, [input.authorId])
  return {
    comment: { ...(data as Omit<CommentWithAuthor, 'author'>), author: authors[input.authorId] || null },
    error: null,
  }
}

export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string
): Promise<string | null> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  return error?.message ?? null
}

/** Modifică textul unui comentariu. updated_at e pus de trigger în DB. */
export async function updateComment(
  supabase: SupabaseClient,
  commentId: string,
  content: string
): Promise<{ updatedAt: string | null; error: string | null }> {
  const trimmed = content.trim()
  if (!trimmed) return { updatedAt: null, error: 'Comentariul nu poate rămâne gol.' }

  const { data, error } = await supabase
    .from('comments')
    .update({ content: trimmed })
    .eq('id', commentId)
    .select('updated_at')
    .single()

  if (error) return { updatedAt: null, error: error.message }
  return { updatedAt: (data as { updated_at: string | null })?.updated_at ?? null, error: null }
}
