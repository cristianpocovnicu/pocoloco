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

export const CATEGORIES = [
  'Castele', 'Natură', 'Muzee', 'Restaurante', 
  'Trasee', 'Orașe', 'Plaje', 'Sate', 'Biserici', 'Altele'
]

export const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Aventurier', emoji: '🏕️', sub: 'Trekking, camping, off-road' },
  { id: 'cultural', label: 'Cultural', emoji: '🏛️', sub: 'Muzee, castele, istorie' },
  { id: 'gastro', label: 'Gastronomic', emoji: '🍽️', sub: 'Mâncare locală, piețe, degustări' },
  { id: 'relax', label: 'Relaxare', emoji: '🏖️', sub: 'Plaje, spa, city break' },
  { id: 'photo', label: 'Fotografie', emoji: '📸', sub: 'Locuri vizuale, peisaje, arhitectură' },
]

export const TRANSPORT_TYPES = [
  { id: 'car', label: 'Cu mașina', emoji: '🚗' },
  { id: 'walk', label: 'Pe jos', emoji: '🚶' },
  { id: 'bike', label: 'Cu bicicleta', emoji: '🚴' },
  { id: 'train', label: 'Cu trenul', emoji: '🚂' },
  { id: 'boat', label: 'Cu barca', emoji: '⛵' },
  { id: 'plane', label: 'Cu avionul', emoji: '✈️' },
]
