import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Acum'
  if (seconds < 3600) return `Acum ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Acum ${Math.floor(seconds / 3600)} ore`
  if (seconds < 2592000) return `Acum ${Math.floor(seconds / 86400)} zile`
  return new Date(date).toLocaleDateString('ro-RO')
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Share nativ unde există, altfel copiere în clipboard.
 * Întoarce ce s-a întâmplat, ca apelantul să poată da feedback.
 */
export async function shareLink(url: string, title?: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch {
      return 'failed' // userul a anulat
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export const CATEGORIES = [
  'Castele', 'Natură', 'Muzee', 'Restaurante',
  'Trasee', 'Orașe', 'Plaje', 'Sate', 'Biserici', 'Altele'
]

export const CATEGORY_ICONS: Record<string, string> = {
  'Castele': '🏰',
  'Natură': '🌲',
  'Muzee': '🏛️',
  'Restaurante': '🍽️',
  'Trasee': '🥾',
  'Orașe': '🏙️',
  'Plaje': '🏖️',
  'Sate': '🏘️',
  'Biserici': '⛪',
  'Altele': '📍',
}

export const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Aventurier', emoji: '🏕️', sub: 'Trekking, camping, off-road' },
  { id: 'cultural', label: 'Cultural', emoji: '🏛️', sub: 'Muzee, castele, istorie' },
  { id: 'gastro', label: 'Gastronomic', emoji: '🍽️', sub: 'Mâncare locală, piețe, degustări' },
  { id: 'relax', label: 'Relaxare', emoji: '🏖️', sub: 'Plaje, spa, city break' },
  { id: 'photo', label: 'Fotografie', emoji: '📸', sub: 'Locuri vizuale, peisaje, arhitectură' },
]

export const REGIONS = [
  { id: 'romania', label: 'România', emoji: '🇷🇴', sub: 'Munți, sate, castele, Delta' },
  { id: 'europa', label: 'Europa', emoji: '🌍', sub: 'City break-uri, coaste, trasee' },
  { id: 'mondial', label: 'Mondial', emoji: '🧭', sub: 'Oriunde te duce curiozitatea' },
]

export const TRANSPORT_TYPES = [
  { id: 'car', label: 'Cu mașina', emoji: '🚗' },
  { id: 'walk', label: 'Pe jos', emoji: '🚶' },
  { id: 'bike', label: 'Cu bicicleta', emoji: '🚴' },
  { id: 'train', label: 'Cu trenul', emoji: '🚂' },
  { id: 'boat', label: 'Cu barca', emoji: '⛵' },
  { id: 'plane', label: 'Cu avionul', emoji: '✈️' },
]
