'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, AlertTriangle, MapPin, Pencil, Route, Users, Star, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Principal', items: [
    { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
    { href: '/admin/reports', label: 'Raportări', Icon: AlertTriangle, badge: '7', badgeColor: 'bg-[#E8440A]' },
  ]},
  { label: 'Conținut', items: [
    { href: '/admin/locations', label: 'Locații', Icon: MapPin, badge: '12', badgeColor: 'bg-[#D97706]' },
    { href: '/admin/experiences', label: 'Experiențe', Icon: Pencil },
    { href: '/admin/trips', label: 'Călătorii', Icon: Route },
  ]},
  { label: 'Comunitate', items: [
    { href: '/admin/users', label: 'Useri', Icon: Users },
    { href: '/admin/guides', label: 'Ghizi', Icon: Star, badge: '3', badgeColor: 'bg-[#D97706]' },
  ]},
  { label: 'Sistem', items: [
    { href: '/admin/settings', label: 'Setări', Icon: Settings },
  ]},
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-[#1A1410] min-h-screen flex flex-col flex-shrink-0">
      <div className="px-4 py-5 border-b border-white/10 mb-4">
        <div className="font-outfit text-[18px] font-bold text-white">🧭 pocoloco</div>
        <div className="text-[10px] text-white/35 mt-0.5">Admin Dashboard</div>
      </div>

      <nav className="flex-1 px-0">
        {NAV.map(section => (
          <div key={section.label} className="mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/25 px-4 mb-1.5">{section.label}</div>
            {section.items.map(({ href, label, Icon, badge, badgeColor }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-outfit font-medium relative transition-colors',
                    active
                      ? 'bg-[rgba(232,68,10,0.18)] text-white'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                  )}
                >
                  {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#E8440A] rounded-r" />}
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  {badge && <span className={`${badgeColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full`}>{badge}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center text-[12px] font-bold text-white">C</div>
          <div>
            <div className="text-[12px] font-semibold text-white">Cristian</div>
            <div className="text-[10px] text-white/35">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
