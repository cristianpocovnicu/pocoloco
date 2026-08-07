/**
 * Categoriile de activitate.
 *
 * Ce faci într-o vacanță nu e mereu un loc de pe hartă: o tură cu buggy,
 * o scufundare, un curs de gătit. Astea sunt activități — au titlu, poate
 * o zonă, dar n-au pin.
 *
 * `id` e valoarea din DB (vezi constrângerea din 20260808_experience_kinds.sql).
 */
export const ACTIVITY_CATEGORIES = [
  { id: 'adrenalina',  label: 'Adrenalină',  emoji: '🪂' },
  { id: 'pe_apa',      label: 'Pe apă',      emoji: '🤿' },
  { id: 'natura',      label: 'Natură',      emoji: '🥾' },
  { id: 'gastronomie', label: 'Gastronomie', emoji: '🍽️' },
  { id: 'cultura',     label: 'Cultură',     emoji: '🎭' },
  { id: 'distractie',  label: 'Distracție',  emoji: '🎡' },
  { id: 'wellness',    label: 'Wellness',    emoji: '💆' },
  { id: 'altele',      label: 'Altele',      emoji: '✨' },
] as const

export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number]['id']

export type ExperienceKind = 'place_visit' | 'activity'

export function activityCategory(id: string | null | undefined) {
  if (!id) return null
  return ACTIVITY_CATEGORIES.find(c => c.id === id) || null
}

/** „🪂 Adrenalină", pentru badge-urile din carduri. */
export function activityLabel(id: string | null | undefined): string | null {
  const category = activityCategory(id)
  return category ? `${category.emoji} ${category.label}` : null
}

/**
 * Ratingurile folosesc aceleași trei coloane, dar la o activitate
 * întrebările sunt altele: nu te interesează aglomerația la un loc, ci
 * cât de bine a fost organizată tura și dacă a meritat banii.
 */
export function ratingLabels(kind: ExperienceKind) {
  return kind === 'activity'
    ? {
        experience: 'Experiență generală',
        access: 'Organizare',
        crowd: 'Raport calitate-preț',
      }
    : {
        experience: 'Experiență generală',
        access: 'Acces și organizare',
        crowd: 'Aglomerație și așteptare',
      }
}
