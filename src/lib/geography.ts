/**
 * Când are o locație geografia de care are nevoie căutarea.
 *
 * Definiția nu e o preferință, e o citire: `search_locations` (migrarea
 * 37) potrivește termenul căutat pe **name, locality, admin_area_1,
 * admin_area_2 și country**. Deci o locație e „găsibilă geografic" dacă
 * are măcar unul dintre nivelurile de sub țară.
 *
 * `country` lipsește intenționat din condiție, deși căutarea îl
 * folosește: fluxul îi pune „România" ca fallback când Google nu dă
 * altceva, așa că e completat aproape peste tot. Dacă l-am număra,
 * semnalul din admin n-ar mai porni niciodată — iar el există tocmai
 * pentru locațiile care n-au nimic mai fin decât o țară.
 *
 * De ce nu doar `admin_area_1`, cum era până pe 11 august 2026: sunt
 * locuri care **sunt** propria regiune. Google întoarce pentru Tașkent o
 * localitate și o țară, fără nivel 1 — la fel pentru multe capitale.
 * Erau numărate ca „fără regiune", butonul le rescria aceleași câmpuri,
 * `admin_area_1` rămânea gol și bannerul nu pleca niciodată.
 */

export type LocationGeography = {
  locality?: string | null
  admin_area_1?: string | null
  admin_area_2?: string | null
}

const filled = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0

/** Nivelurile de sub țară, de la cel mai larg la cel mai fin. */
export function hasSearchableGeography(geo: LocationGeography): boolean {
  return filled(geo.admin_area_1) || filled(geo.admin_area_2) || filled(geo.locality)
}

/**
 * Ce nivel are efectiv completat, spus pe nume.
 *
 * Rândul din admin arăta doar `regiune: X`, din `admin_area_1`. Un loc cu
 * localitate și fără regiune apărea fără niciun nivel, deși avea unul —
 * de aici și impresia că bannerul numără greșit ce se vede pe ecran.
 */
export function geographyLabel(geo: LocationGeography): string | null {
  if (filled(geo.admin_area_1)) return `regiune: ${geo.admin_area_1}`
  if (filled(geo.admin_area_2)) return `județ: ${geo.admin_area_2}`
  if (filled(geo.locality)) return `localitate: ${geo.locality}`
  return null
}
