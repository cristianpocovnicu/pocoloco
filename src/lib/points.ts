import type { SupabaseClient } from '@supabase/supabase-js'

/** Un rând din registru, așa cum îl vede cel care a primit punctele. */
export type LedgerEntry = {
  id: string
  actor_id: string
  recipient_id: string | null
  action_type: string
  content_type: string | null
  content_id: string | null
  meta: Record<string, unknown> | null
  points: number
  created_at: string
}

export type PointLevel = {
  level: number
  min_points: number
  name: string
  unlock: string | null
}

/**
 * Curba de rezervă, pentru cazul în care `point_levels` nu poate fi citit.
 * Trebuie să rămână identică cu tabelul din 021_20260807_points_1_core.sql —
 * acolo e sursa adevărului, asta e doar plasa de siguranță.
 */
const FALLBACK_LEVELS: PointLevel[] = [
  { level: 1, min_points: 0, name: 'Turist Nou', unlock: null },
  { level: 2, min_points: 40, name: 'Explorator', unlock: null },
  { level: 3, min_points: 100, name: 'Călător', unlock: null },
  { level: 4, min_points: 200, name: 'Călător', unlock: null },
  { level: 5, min_points: 350, name: 'Aventurier', unlock: null },
  { level: 6, min_points: 550, name: 'Aventurier', unlock: null },
  { level: 7, min_points: 750, name: 'Aventurier', unlock: null },
  { level: 8, min_points: 1000, name: 'Navigator', unlock: null },
  { level: 9, min_points: 1250, name: 'Navigator', unlock: null },
  { level: 10, min_points: 1500, name: 'Navigator', unlock: null },
  { level: 11, min_points: 2000, name: 'Navigator', unlock: null },
  { level: 12, min_points: 2500, name: 'Ghid', unlock: null },
  { level: 13, min_points: 2850, name: 'Ghid', unlock: null },
  { level: 14, min_points: 3150, name: 'Ghid', unlock: null },
  { level: 15, min_points: 3500, name: 'Ghid Local', unlock: null },
  { level: 16, min_points: 4200, name: 'Ghid Local', unlock: null },
  { level: 17, min_points: 4900, name: 'Ghid Local', unlock: null },
  { level: 18, min_points: 5600, name: 'Ghid Local', unlock: null },
  { level: 19, min_points: 6300, name: 'Ghid Local', unlock: null },
  { level: 20, min_points: 7000, name: 'Maestru Călător', unlock: null },
]

/** Curba nu se schimbă între pagini — o citim o dată per sesiune de browser. */
let levelsCache: Promise<PointLevel[]> | null = null

export function fetchLevels(supabase: SupabaseClient): Promise<PointLevel[]> {
  if (!levelsCache) {
    levelsCache = (async () => {
      try {
        const { data, error } = await supabase
          .from('point_levels')
          .select('level, min_points, name, unlock')
          .order('level')
        // tabelul vine din migrarea de puncte; fără el rămânem pe curba de rezervă
        if (error || !data) return FALLBACK_LEVELS
        const rows = data as PointLevel[]
        return rows.length > 0 ? rows : FALLBACK_LEVELS
      } catch {
        return FALLBACK_LEVELS
      }
    })()
  }
  return levelsCache
}

export type LevelProgress = {
  level: number
  name: string
  unlock: string | null
  /** punctele de la care începe nivelul curent */
  from: number
  /** punctele necesare pentru următorul nivel, null la ultimul */
  next: number | null
  toNext: number | null
  /** cât din drumul spre nivelul următor e făcut, 0–100 */
  percent: number
}

export function levelProgress(levels: PointLevel[], points: number): LevelProgress {
  const total = Math.max(points || 0, 0)
  const sorted = [...levels].sort((a, b) => a.level - b.level)

  const current = [...sorted].reverse().find(l => l.min_points <= total)
    || { level: 1, min_points: 0, name: 'Turist Nou', unlock: null }
  const next = sorted.find(l => l.level === current.level + 1) || null

  const span = next ? next.min_points - current.min_points : 0
  const done = total - current.min_points

  return {
    level: current.level,
    name: current.name,
    unlock: current.unlock,
    from: current.min_points,
    next: next ? next.min_points : null,
    toNext: next ? Math.max(next.min_points - total, 0) : null,
    percent: next && span > 0 ? Math.min(Math.round((done / span) * 100), 100) : 100,
  }
}

export type PointsSummary = {
  points: number
  level: number
}

/** Totalul și nivelul, când pagina n-a citit deja profilul. */
export async function fetchPointsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<PointsSummary> {
  const { data, error } = await supabase
    .from('profiles')
    .select('points_total, points_level')
    .eq('id', userId)
    .maybeSingle()

  // coloanele vin din migrarea 021_20260807_points_1_core; până e rulată,
  // secțiunea de progres pur și simplu nu are ce arăta
  if (error || !data) return { points: 0, level: 1 }
  const row = data as { points_total: number | null; points_level: number | null }
  return { points: row.points_total || 0, level: row.points_level || 1 }
}

const PAGE_SIZE = 30

/** Istoricul, paginat pe cursor ca postările noi să nu decaleze paginile. */
export async function fetchLedger(
  supabase: SupabaseClient,
  userId: string,
  before?: string
): Promise<{ entries: LedgerEntry[]; done: boolean }> {
  let request = supabase
    .from('points_ledger')
    .select('id, actor_id, recipient_id, action_type, content_type, content_id, meta, points, created_at')
    .or(`recipient_id.eq.${userId},and(recipient_id.is.null,actor_id.eq.${userId})`)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) request = request.lt('created_at', before)

  const { data, error } = await request
  if (error || !data) return { entries: [], done: true }

  const entries = data as LedgerEntry[]
  return { entries, done: entries.length < PAGE_SIZE }
}

/**
 * Punctele adunate de la un moment dat încoace.
 *
 * Le folosim ca să anunțăm „+27 de puncte" după o publicare: triggerele
 * rulează în aceeași tranzacție cu insertul, deci rândurile există deja
 * când ne întoarcem în client. Prinde și eventualul milestone câștigat
 * odată cu acțiunea.
 */
/**
 * Începutul ferestrei „ce am câștigat acum". Scădem 30 de secunde ca o
 * mică diferență între ceasul browserului și cel al bazei să nu ne facă
 * să ratăm chiar rândurile pe care le căutăm.
 */
export function justNowWindow(): string {
  return new Date(Date.now() - 30_000).toISOString()
}

export async function fetchPointsSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('points')
    .or(`recipient_id.eq.${userId},and(recipient_id.is.null,actor_id.eq.${userId})`)
    .gte('created_at', sinceIso)
    .limit(50)

  if (error || !data) return 0
  return (data as { points: number }[]).reduce((sum, row) => sum + (row.points || 0), 0)
}

const CONTENT_LABEL: Record<string, string> = {
  experience: 'experiența ta',
  trip: 'călătoria ta',
  location: 'locația',
  profile: 'profilul tău',
  comment: 'comentariul tău',
}

/**
 * Rândul, pus în cuvinte. `actorName` lipsește când punctele sunt ale
 * tale pentru propria acțiune — atunci propoziția e la persoana a doua.
 */
export function describeEntry(
  entry: LedgerEntry,
  actorName?: string | null,
  badgeName?: string | null
): { text: string; emoji: string } {
  const mine = entry.recipient_id === null
  const who = actorName || 'Cineva'
  const what = CONTENT_LABEL[entry.content_type || ''] || 'conținutul tău'

  switch (entry.action_type) {
    case 'experience_posted':
      return { text: 'Ai publicat o experiență', emoji: '✍️' }
    case 'trip_posted':
      return { text: 'Ai publicat o călătorie', emoji: '🧭' }
    case 'location_added':
      return { text: 'Ai adăugat o locație nouă', emoji: '📍' }
    case 'experience_upvoted':
      return mine
        ? { text: 'Ai votat o experiență', emoji: '👍' }
        : { text: `${who} a votat experiența ta`, emoji: '👍' }
    case 'trip_upvoted':
      return mine
        ? { text: 'Ai votat o călătorie', emoji: '👍' }
        : { text: `${who} a votat călătoria ta`, emoji: '👍' }
    case 'comment_upvoted':
      return mine
        ? { text: 'Ai votat un comentariu', emoji: '👍' }
        : { text: `${who} a votat comentariul tău`, emoji: '👍' }
    case 'comment_added':
      return mine
        ? { text: 'Ai comentat', emoji: '💬' }
        : { text: `${who} a comentat la experiența ta`, emoji: '💬' }
    case 'comment_reply':
      return mine
        ? { text: 'Ai răspuns la un comentariu', emoji: '↩️' }
        : { text: `${who} ți-a răspuns la comentariu`, emoji: '↩️' }
    case 'trip_saved':
      return mine
        ? { text: 'Ai salvat o călătorie', emoji: '🔖' }
        : { text: `${who} ți-a salvat călătoria`, emoji: '🔖' }
    case 'location_wishlist':
      return { text: 'Ai pus un loc pe listă', emoji: '🗺️' }
    case 'location_visited':
      return { text: 'Ai bifat un loc ca vizitat', emoji: '✅' }
    case 'visit_confirmed':
      return { text: 'Ai ajuns într-un loc pe care-l plănuiai', emoji: '🎯' }
    case 'user_followed':
      return mine
        ? { text: 'Ai început să urmărești un călător', emoji: '👋' }
        : { text: `${who} a început să te urmărească`, emoji: '👋' }
    case 'content_shared':
      return mine
        ? { text: 'Ai distribuit un conținut', emoji: '📤' }
        : { text: `${who} a distribuit ${what}`, emoji: '📤' }
    case 'profile_completed':
      return { text: 'Ți-ai completat profilul', emoji: '🙋' }
    case 'milestone':
      return { text: badgeName ? `Insignă: ${badgeName}` : 'Insignă câștigată', emoji: '🏅' }
    case 'referral_completed':
      return { text: 'Un prieten invitat de tine a devenit activ', emoji: '🎁' }
    case 'referral_welcome':
      return { text: 'Bonus de bun venit — ai intrat prin invitația unui prieten', emoji: '🎉' }
    default:
      return { text: 'Puncte primite', emoji: '⭐' }
  }
}
