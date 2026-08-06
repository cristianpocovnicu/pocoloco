import { LayoutDashboard, AlertTriangle, MapPin, Pencil, Route, Users, type LucideIcon } from 'lucide-react'

export type AdminNavItem = {
  href: string
  label: string
  Icon: LucideIcon
  /** cheia contorului afișat ca badge lângă item */
  badge?: 'reports' | 'locations'
  badgeColor?: string
}

export type AdminCounts = {
  pendingReports: number
  pendingLocations: number
}

export const ADMIN_NAV: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
      { href: '/admin/reports', label: 'Raportări', Icon: AlertTriangle, badge: 'reports', badgeColor: 'bg-[#E8440A]' },
    ],
  },
  {
    label: 'Conținut',
    items: [
      { href: '/admin/locations', label: 'Locații', Icon: MapPin, badge: 'locations', badgeColor: 'bg-[#D97706]' },
      { href: '/admin/experiences', label: 'Experiențe', Icon: Pencil },
      { href: '/admin/trips', label: 'Călătorii', Icon: Route },
    ],
  },
  {
    label: 'Comunitate',
    items: [{ href: '/admin/users', label: 'Useri', Icon: Users }],
  },
]

export function badgeValue(item: AdminNavItem, counts: AdminCounts): number {
  if (item.badge === 'reports') return counts.pendingReports
  if (item.badge === 'locations') return counts.pendingLocations
  return 0
}
