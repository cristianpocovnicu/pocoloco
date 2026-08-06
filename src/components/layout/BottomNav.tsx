'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, BookOpen, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'

const NAV_ITEMS = [
  { href: '/', label: 'Acasă', Icon: Home },
  { href: '/search', label: 'Caută', Icon: Search },
  { href: '/trips', label: 'Ghiduri', Icon: BookOpen },
  { href: '/create', label: 'Creează', Icon: Plus },
  { href: '/notifications', label: 'Alerte', Icon: Bell },
]

export default function BottomNav() {
  const pathname = usePathname()
  const unread = useUnreadNotifications()

  return (
    <nav className="bottom-nav-mobile fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center justify-around px-1 pt-2.5 pb-6 max-w-[520px] mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          const badge = href === '/notifications' ? unread : 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors',
                active ? 'text-[#E8440A]' : 'text-[#9B9B9B]'
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-[#E8440A] text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-outfit', active ? 'font-semibold text-[#E8440A]' : 'text-[#9B9B9B]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
