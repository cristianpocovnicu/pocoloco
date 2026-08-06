import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminProfile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
}

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

/** Număr de rânduri, fără să aducă datele. Întoarce 0 dacă query-ul eșuează. */
export async function countRows(
  supabase: SupabaseClient,
  table: string,
  filter?: (q: any) => any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  let q: any = supabase.from(table).select('id', { count: 'exact', head: true }) // eslint-disable-line @typescript-eslint/no-explicit-any
  if (filter) q = filter(q)
  const { count } = await q
  return count ?? 0
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

/** Etichete + culori pentru statusuri, ca să arate la fel peste tot în admin. */
export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active:    { label: 'Activ',          className: 'bg-[#ECFDF5] text-[#059669]' },
  approved:  { label: 'Aprobat',        className: 'bg-[#ECFDF5] text-[#059669]' },
  pending:   { label: 'În așteptare',   className: 'bg-[#FFFBEB] text-[#D97706]' },
  reported:  { label: 'Raportat',       className: 'bg-[#FEF2F2] text-[#DC2626]' },
  rejected:  { label: 'Respins',        className: 'bg-[#FEF2F2] text-[#DC2626]' },
  removed:   { label: 'Șters',          className: 'bg-[#F1F1F1] text-[#6B6B6B]' },
  suspended: { label: 'Suspendat',      className: 'bg-[#FEF2F2] text-[#DC2626]' },
  draft:     { label: 'Ciornă',         className: 'bg-[#F1F1F1] text-[#6B6B6B]' },
  resolved:  { label: 'Rezolvat',       className: 'bg-[#ECFDF5] text-[#059669]' },
  dismissed: { label: 'Respins',        className: 'bg-[#F1F1F1] text-[#6B6B6B]' },
}

export function statusStyle(status?: string | null) {
  return STATUS_STYLES[status || ''] || { label: status || '—', className: 'bg-[#F1F1F1] text-[#6B6B6B]' }
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  experience: 'Experiență',
  location: 'Locație',
  trip: 'Călătorie',
  user: 'User',
}
