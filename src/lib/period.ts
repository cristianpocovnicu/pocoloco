/**
 * Când a fost cineva într-un loc — lună și an, ambele opționale.
 *
 * Data postării nu spune nimic despre vizită: poți scrie în ianuarie
 * despre o vară. Perioada schimbă felul în care se citește o recenzie
 * (aglomerație, vreme, ce era deschis), de asta o ținem separat.
 */
export const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
]

/** Cel mai vechi an oferit în selector. Baza acceptă de la 1990. */
const OLDEST_YEAR = 1990

/**
 * Anii propuși: de la anul viitor (o vacanță plănuită și deja povestită)
 * până la 30 de ani în urmă. Limita reală de sus stă aici, nu într-un
 * CHECK din bază, ca să se mute singură la trecerea în anul următor.
 */
export function selectableYears(): number[] {
  const current = new Date().getFullYear()
  const newest = current + 1
  const oldest = Math.max(current - 30, OLDEST_YEAR)
  const years: number[] = []
  for (let year = newest; year >= oldest; year--) years.push(year)
  return years
}

export function currentYear(): number {
  return new Date().getFullYear()
}

/** „august 2026", „2026", sau nimic dacă nu știm nici anul. */
export function formatVisitedPeriod(
  year: number | null | undefined,
  month: number | null | undefined
): string | null {
  if (!year) return null
  if (!month || month < 1 || month > 12) return String(year)
  return `${MONTHS_RO[month - 1]} ${year}`
}
