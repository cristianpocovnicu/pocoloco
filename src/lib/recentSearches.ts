const KEY = 'pocoloco:recent-searches'
const MAX = 6

/** Căutările recente, ținute local în browser. */
export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function addRecentSearch(term: string): string[] {
  const value = term.trim()
  if (typeof window === 'undefined' || value.length < 2) return getRecentSearches()

  // termenul reintrodus urcă în capul listei, nu se dublează
  const next = [value, ...getRecentSearches().filter(x => x.toLowerCase() !== value.toLowerCase())].slice(0, MAX)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // modul privat / storage plin — mergem mai departe fără istoric
  }
  return next
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nimic de făcut
  }
}
