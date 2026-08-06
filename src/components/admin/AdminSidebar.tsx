'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { ADMIN_NAV, badgeValue, type AdminCounts } from './nav'

type Props = {
  counts: AdminCounts
  adminName: string
  adminUsername: string | null
}

export default function AdminSidebar({ counts, adminName, adminUsername }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-52 bg-[#1A1410] min-h-screen flex-col flex-shrink-0 sticky top-0 h-screen">
      <div className="px-4 py-5 border-b border-white/10 mb-4">
        <Link href="/" className="font-outfit text-[18px] font-bold text-white block">🧭 pocoloco</Link>
        <div className="text-[10px] text-white/35 mt-0.5">Admin Dashboard</div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {ADMIN_NAV.map(section => (
          <div key={section.label} className="mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/25 px-4 mb-1.5">{section.label}</div>
            {section.items.map(item => {
              const { href, label, Icon, badgeColor } = item
              const active = pathname === href
              const badge = badgeValue(item, counts)
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
                  {badge > 0 && (
                    <span className={`${badgeColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full`}>{badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <Link href="/" className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors mb-3">
          <ArrowLeft size={12} /> Înapoi la site
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {getInitials(adminName)}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">{adminName}</div>
            <div className="text-[10px] text-white/35 truncate">{adminUsername ? `@${adminUsername}` : 'Admin'}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
