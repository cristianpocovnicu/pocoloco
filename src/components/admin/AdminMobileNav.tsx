'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_NAV, badgeValue, type AdminCounts } from './nav'

const ITEMS = ADMIN_NAV.flatMap(s => s.items)

export default function AdminMobileNav({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname()

  return (
    <div className="md:hidden bg-[#1A1410] sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="font-outfit text-[15px] font-bold text-white">🧭 pocoloco admin</span>
        <Link href="/" className="text-[11px] text-white/45">Înapoi la site</Link>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-3">
        {ITEMS.map(item => {
          const active = pathname === item.href
          const badge = badgeValue(item, counts)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-outfit font-medium flex-shrink-0 transition-colors',
                active ? 'bg-[#E8440A] text-white' : 'bg-white/10 text-white/60'
              )}
            >
              <item.Icon size={13} />
              {item.label}
              {badge > 0 && (
                <span className={`${active ? 'bg-white/25' : item.badgeColor} text-white text-[9px] font-bold px-1.5 rounded-full`}>{badge}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
