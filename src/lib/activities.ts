/**
 * Categoriile de activitate.
 *
 * Ce faci într-o vacanță nu e mereu un loc de pe hartă: o tură cu buggy,
 * o scufundare, un curs de gătit. Astea sunt activități — au titlu, poate
 * o zonă, dar n-au pin.
 *
 * `id` e valoarea din DB (vezi constrângerea din 027_20260808_experience_kinds.sql).
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
        experience: 'Per total',
        access: 'Organizare',
        crowd: 'Raport calitate-preț',
      }
    : {
        experience: 'Per total',
        access: 'Cât de ușor ajungi',
        // eticheta poartă direcția scalei: mai multe stele = mai liber.
        // Fără ea, „Aglomerație" cu 5 stele se citea invers față de
        // convenția universală, deși datele n-au fost niciodată inversate.
        crowd: 'Cât de liber a fost',
      }
}

/**
 * Ce înseamnă fiecare stea, pe fiecare dimensiune.
 *
 * Se arată doar la introducere — sub steaua atinsă sau aleasă. Pe paginile
 * publicate rămâne doar numele dimensiunii: cine citește vede stelele, nu
 * are nevoie de legendă.
 */
export function ratingScales(kind: ExperienceKind) {
  const experience = ['dezamăgitor', 'slab', 'ok', 'foarte bun', 'excepțional']

  return kind === 'activity'
    ? {
        experience,
        access: ['dezorganizat', 'cam haotic', 'ok', 'bine organizat', 'impecabil'],
        crowd: ['prea scump', 'cam scump', 'corect', 'bun', 'excelent'],
      }
    : {
        experience,
        access: ['greu de ajuns', 'complicat', 'rezonabil', 'ușor', 'foarte ușor'],
        crowd: ['foarte aglomerat', 'aglomerat', 'suportabil', 'destul de liber', 'liber, fără cozi'],
      }
}
