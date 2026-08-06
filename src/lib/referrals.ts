import type { SupabaseClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'pocoloco_ref'
const TTL_DAYS = 30

type StoredReferral = { code: string; at: number }

/** Codul din ?ref=, ținut 30 de zile — cât să apuce omul să-și facă cont. */
export function storeReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  const clean = code.trim().toUpperCase().slice(0, 16)
  if (!clean) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean, at: Date.now() }))
  } catch {
    // mod incognito sau storage plin — invitația se pierde, nimic grav
  }
}

export function readStoredReferral(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredReferral
    if (!parsed?.code) return null
    if (Date.now() - parsed.at > TTL_DAYS * 24 * 60 * 60 * 1000) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed.code
  } catch {
    return null
  }
}

export function clearStoredReferral(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* vezi mai sus */ }
}

/**
 * Leagă contul curent de cine l-a invitat.
 *
 * Funcția SQL refuză codurile invalide, propriul cod și userii care au
 * deja un invitator, deci apelul e sigur de repetat.
 */
export async function applyStoredReferral(supabase: SupabaseClient): Promise<boolean> {
  const code = readStoredReferral()
  if (!code) return false

  try {
    const { data, error } = await supabase.rpc('apply_referral_code', { p_code: code })
    if (error) return false

    const ok = !!(data as { ok?: boolean })?.ok
    // 'already' sau cod greșit: nu mai are rost să încercăm la fiecare pagină
    clearStoredReferral()
    return ok
  } catch {
    return false
  }
}

export type ReferralStats = {
  code: string | null
  /** invitați care au ajuns să conteze (au primit recompensa) */
  rewarded: number
  /** câți au intrat pe linkul tău și și-au făcut cont */
  signedUp: number
  limit: number
}

export const REFERRAL_LIMIT = 10

export async function fetchReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ReferralStats> {
  const empty: ReferralStats = { code: null, rewarded: 0, signedUp: 0, limit: REFERRAL_LIMIT }

  try {
    const [profileRes, invitedRes, rewardedRes] = await Promise.all([
      supabase.from('profiles').select('referral_code').eq('id', userId).maybeSingle(),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', userId),
      supabase
        .from('points_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .eq('action_type', 'referral_completed'),
    ])

    if (profileRes.error) return empty

    return {
      code: (profileRes.data as { referral_code: string | null } | null)?.referral_code || null,
      signedUp: invitedRes.count || 0,
      rewarded: rewardedRes.count || 0,
      limit: REFERRAL_LIMIT,
    }
  } catch {
    return empty
  }
}
