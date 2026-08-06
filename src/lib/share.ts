import type { SupabaseClient } from '@supabase/supabase-js'

export type ShareContentType = 'experience' | 'trip' | 'location' | 'profile'
export type SharePlatform = 'whatsapp' | 'facebook' | 'copy_link' | 'native' | 'other'

/** Codul de invitație al userului curent, ca linkul distribuit să-l poarte cu el. */
const codeCache: Record<string, string | null> = {}

export async function myReferralCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  if (userId in codeCache) return codeCache[userId]

  const { data, error } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()

  // coloana vine din migrarea de invitații; fără ea linkul rămâne curat
  const code = error || !data ? null : ((data as { referral_code: string | null }).referral_code || null)
  codeCache[userId] = code
  return code
}

/** Adaugă ?ref=COD la link, fără să strice parametrii existenți. */
export function withReferral(url: string, code: string | null): string {
  if (!code) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('ref', code)
    return parsed.toString()
  } catch {
    return url
  }
}

export function whatsappUrl(url: string, title?: string): string {
  const text = title ? `${title} — ${url}` : url
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

/**
 * Înregistrează share-ul și acordă punctele.
 *
 * Punctele sunt fixate în funcția SQL, nu aici: clientul nu poate cere o
 * sumă la alegere. Plafonul e o dată per conținut, per platformă, pe zi.
 * Orice eroare e înghițită — share-ul s-a întâmplat deja.
 */
export async function recordShare(
  supabase: SupabaseClient,
  contentType: ShareContentType,
  contentId: string,
  platform: SharePlatform
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('record_share', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_platform: platform,
    })
    if (error || !data) return 0
    return (data as { points?: number }).points || 0
  } catch {
    return 0
  }
}
