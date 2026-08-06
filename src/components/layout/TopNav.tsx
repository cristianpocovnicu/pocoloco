'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Users, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import UserMenu from './UserMenu'

const NAV_LINKS = [
  { href: '/', label: 'Acasă', Icon: Home },
  { href: '/search', label: 'Caută', Icon: Search },
  { href: '/following', label: 'Urmaresc', Icon: Users },
  { href: '/add-experience', label: 'Creează', Icon: Plus },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="top-nav-desktop bg-white border-b border-[rgba(0,0,0,0.08)] px-8 items-center sticky top-0 z-50">
      <Link href="/" className="font-outfit text-xl font-bold text-[#E8440A] mr-10 py-4 whitespace-nowrap">
        🧭 pocoloco
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-5 font-outfit text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                active
                  ? 'text-[#E8440A] border-[#E8440A] font-semibold'
                  : 'text-[#6B6B6B] border-transparent hover:text-[#0F0F0F]'
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2 flex items-center gap-2 w-44 cursor-pointer">
          <Search size={14} className="text-[#9B9B9B]" />
          <span className="text-sm text-[#9B9B9B]">Caută...</span>
        </div>
        <div className="relative w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer">
          <Bell size={16} className="text-[#6B6B6B]" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E8440A] rounded-full border border-white" />
        </div>
        <UserMenu />
      </div>
    </nav>
  )
}
