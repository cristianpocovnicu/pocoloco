/**
 * Numele opririlor, găsite în povestea unei călătorii.
 *
 * Funcție pură, fără React și fără acces la bază: primește textul și
 * locurile, întoarce bucăți de text, unele cu destinație. Cine o folosește
 * decide cum arată linkul.
 */

export type LinkedPlace = { id: string; name: string }

export type Segment = {
  text: string
  /** id-ul locului, dacă bucata asta e un nume recunoscut */
  placeId?: string
}

/**
 * Diacriticele cad, dar lungimea rămâne.
 *
 * `normalize('NFD')` ar descompune „ă" în două caractere și ar deplasa
 * toate indicii de după el — iar noi tăiem textul original după poziții
 * găsite în cel normalizat. De aceea maparea e caracter cu caracter.
 */
const FOLD: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't',
  á: 'a', à: 'a', ä: 'a', é: 'e', è: 'e', ë: 'e', í: 'i', ì: 'i',
  ó: 'o', ò: 'o', ö: 'o', ú: 'u', ù: 'u', ü: 'u', ç: 'c', ñ: 'n',
}

function fold(text: string): string {
  let out = ''
  for (const char of text) {
    const lower = char.toLowerCase()
    out += FOLD[lower] ?? lower
  }
  return out
}

/** Sub atâtea litere, un nume prinde jumătate din text („Sat", „Ana"). */
const MIN_NAME = 4

/** Litera dinaintea/de după potrivire trebuie să nu fie literă. */
function isBoundary(char: string | undefined): boolean {
  if (char === undefined) return true
  // fără clase Unicode: ținta de compilare a proiectului nu le acoperă,
  // iar intervalul de mai jos prinde diacriticele care ne interesează
  return !/[0-9A-Za-zÀ-ž]/.test(char)
}

/**
 * Împarte textul în bucăți, marcând prima apariție a fiecărui loc.
 *
 * Prima apariție, nu toate: un nume repetat de cinci ori ar transforma
 * povestea într-un covor de linkuri. Potrivirile se caută pe text
 * normalizat (fără diacritice, litere mici), dar se taie din cel original.
 */
export function linkifyPlaces(text: string, places: LinkedPlace[]): Segment[] {
  if (!text) return []

  const haystack = fold(text)
  const matches: { start: number; end: number; placeId: string }[] = []

  // numele lungi întâi: „Pico do Arieiro" bate „Pico", dacă ambele există
  const candidates = places
    .filter(place => place.name.trim().length >= MIN_NAME)
    .sort((a, b) => b.name.trim().length - a.name.trim().length)

  /**
   * Zonele deja vorbite: și cele legate, și **toate** aparițiile unui nume
   * mai lung. Fără ele, „Pico" s-ar lega în interiorul celei de-a doua
   * „Pico do Arieiro" — un link corect ca text, dar spre alt loc.
   */
  const blocked: { start: number; end: number }[] = []
  const free = (start: number, end: number) =>
    !blocked.some(range => start < range.end && end > range.start)

  for (const place of candidates) {
    const needle = fold(place.name.trim())
    if (needle.length === 0) continue

    let linked = false
    let from = 0

    while (from <= haystack.length - needle.length) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      const end = at + needle.length

      if (isBoundary(text[at - 1]) && isBoundary(text[end]) && free(at, end)) {
        // prima apariție liberă devine link; restul doar ocupă terenul
        if (!linked) {
          matches.push({ start: at, end, placeId: place.id })
          linked = true
        }
        blocked.push({ start: at, end })
      }

      from = at + 1
    }
  }

  if (matches.length === 0) return [{ text }]

  matches.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start) })
    segments.push({ text: text.slice(match.start, match.end), placeId: match.placeId })
    cursor = match.end
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
