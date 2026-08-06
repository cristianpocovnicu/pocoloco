import type { SupabaseClient } from '@supabase/supabase-js'

// helpers de profil, folosiți și în afara zonei de admin
export { colorFor, initialsOf, fetchProfilesMap } from './profiles'
export type { MiniProfile } from './profiles'

export type AdminProfile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
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
