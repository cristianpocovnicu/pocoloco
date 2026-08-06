import type { SupabaseClient } from '@supabase/supabase-js'

export type MiniProfile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

const AVATAR_COLORS = ['#E8440A', '#5B4FCF', '#059669', '#D97706', '#0EA5E9', '#DB2777']

/** Culoare stabilă de avatar, derivată din id — același user are mereu aceeași culoare. */
export function colorFor(id: string): string {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export function initialsOf(name?: string | null): string {
  if (!name?.trim()) return '??'
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Aduce profilurile pentru un set de id-uri, ca dicționar id -> profil.
 * Evită dependența de numele relațiilor (FK) din Postgrest.
 */
export async function fetchProfilesMap(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Record<string, MiniProfile>> {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]))
  if (unique.length === 0) return {}

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', unique)

  const map: Record<string, MiniProfile> = {}
  for (const p of (data || []) as MiniProfile[]) map[p.id] = p
  return map
}
