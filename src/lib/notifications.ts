import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfilesMap, type MiniProfile } from './profiles'

export type NotificationType = 'upvote' | 'follow' | 'comment' | 'reply'

export type NotificationRow = {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  entity_type: 'experience' | 'comment' | 'user' | null
  entity_id: string | null
  read: boolean
  created_at: string
}

export type NotificationItem = NotificationRow & {
  actor: MiniProfile | null
  /** unde duce notificarea, sau null dacă entitatea nu mai există */
  href: string | null
  text: string
}

export const NOTIFICATION_TEXT: Record<NotificationType, string> = {
  upvote: 'ți-a apreciat experiența',
  follow: 'a început să te urmărească',
  comment: 'a comentat la experiența ta',
  reply: 'ți-a răspuns la comentariu',
}

export async function countUnread(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count ?? 0
}

/**
 * Notificările userului, cu autorul acțiunii și linkul rezolvat.
 * Experiențele sunt traduse în linkuri către pagina locației printr-un
 * singur query, nu unul per notificare.
 */
export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, actor_id, type, entity_type, entity_id, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const rows = (data || []) as NotificationRow[]
  if (rows.length === 0) return []

  const actors = await fetchProfilesMap(supabase, rows.map(r => r.actor_id))

  // experiență -> locația în care se află, ca să avem unde trimite userul
  const experienceIds = Array.from(new Set(
    rows.filter(r => r.entity_type === 'experience' && r.entity_id).map(r => r.entity_id as string)
  ))
  const locationByExperience: Record<string, string> = {}
  if (experienceIds.length > 0) {
    const { data: exps } = await supabase
      .from('experiences')
      .select('id, location_id')
      .in('id', experienceIds)
    for (const e of (exps || []) as { id: string; location_id: string }[]) {
      locationByExperience[e.id] = e.location_id
    }
  }

  return rows.map(row => {
    const actor = row.actor_id ? actors[row.actor_id] || null : null

    let href: string | null = null
    if (row.type === 'follow') {
      href = actor?.username ? `/profile/${actor.username}` : null
    } else if (row.entity_type === 'experience' && row.entity_id) {
      const locationId = locationByExperience[row.entity_id]
      href = locationId ? `/location/${locationId}` : null
    }

    return { ...row, actor, href, text: NOTIFICATION_TEXT[row.type] }
  })
}

export async function markAllRead(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  return error?.message ?? null
}

export async function markRead(supabase: SupabaseClient, ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids)
  return error?.message ?? null
}
