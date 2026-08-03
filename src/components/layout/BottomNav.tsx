'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Users, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Acasă', Icon: Home },
  { href: '/search', label: 'Caută', Icon: Search },
  { href: '/following', label: 'Urmaresc', Icon: Users },
  { href: '/add-experience', label: 'Creează', Icon: Plus },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav-mobile fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center justify-around px-2 pt-2.5 pb-6 max-w-[520px] mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors',
                active ? 'text-[#E8440A]' : 'text-[#9B9B9B]'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
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
