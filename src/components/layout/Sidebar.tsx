'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Search, Users, Plus, Bell, Settings, ShieldCheck, BookOpen } from 'lucide-react'
import { cn, formatCount } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'
import { getFollowCounts } from '@/lib/follows'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'
import UserMenu from './UserMenu'

const NAV_LINKS = [
  { href: '/', label: 'Acasă', Icon: Home },
  { href: '/search', label: 'Caută', Icon: Search },
  { href: '/trips', label: 'Călătorii', Icon: BookOpen },
  { href: '/following', label: 'Urmaresc', Icon: Users },
  { href: '/add-experience', label: 'Povestește', Icon: Plus },
]

const NAV_BOTTOM = [
  { href: '/notifications', label: 'Notificări', Icon: Bell },
  { href: '/settings', label: 'Setări', Icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null)
  const unread = useUnreadNotifications()

  useEffect(() => {
    const supabase = createClient()
    const loadUser = async (id?: string) => {
      setLoggedIn(!!id)
      if (!id) {
        setIsAdmin(false)
        setCounts(null)
        return
      }
      // linkul spre dashboard apare doar pentru conturile cu rol de admin
      const { data } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle()
      setIsAdmin(data?.role === 'admin')
      setCounts(await getFollowCounts(supabase, id))
    }
    supabase.auth.getUser().then(({ data }) => loadUser(data.user?.id))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Zona de admin are propriul sidebar
  if (pathname.startsWith('/admin')) return null

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col bg-white border-r border-[rgba(0,0,0,0.08)] sticky top-0 h-screen">
      <Link href="/" className="font-outfit text-[22px] font-bold text-[#E8440A] px-6 pt-6 pb-7 block">
        🧭 pocoloco
      </Link>

      <nav className="flex-1">
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-6 py-3 font-outfit text-[15px] font-medium transition-all relative',
                active
                  ? 'text-[#0F0F0F] font-semibold'
                  : 'text-[#6B6B6B] hover:bg-[#F8F7F5] hover:text-[#0F0F0F]'
              )}
            >
              {active && <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[#E8440A] rounded-r" />}
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}

        {/* Notificările și setările n-au sens fără cont */}
        {loggedIn && <div className="h-px bg-[rgba(0,0,0,0.08)] mx-6 my-3" />}

        {loggedIn && NAV_BOTTOM.map(({ href, label, Icon }) => {
          const active = pathname === href
          const badge = href === '/notifications' ? unread : 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-6 py-3 font-outfit text-[15px] font-medium transition-all relative',
                active
                  ? 'text-[#0F0F0F] font-semibold'
                  : 'text-[#6B6B6B] hover:bg-[#F8F7F5] hover:text-[#0F0F0F]'
              )}
            >
              {active && <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[#E8440A] rounded-r" />}
              <div className="relative">
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#E8440A] rounded-full border-2 border-white" />
                )}
              </div>
              {label}
              {badge > 0 && (
                <span className="ml-auto bg-[#E8440A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-6 py-3 font-outfit text-[15px] font-medium text-[#5B4FCF] hover:bg-[#EEEDFB] transition-all"
          >
            <ShieldCheck size={21} strokeWidth={1.8} />
            Admin
          </Link>
        )}
      </nav>

      <div className="px-6 py-5 border-t border-[rgba(0,0,0,0.08)]">
        {counts && (
          <Link href="/profile" className="flex items-center gap-3 mb-3 px-1.5">
            <span className="text-[12px] text-[#6B6B6B]">
              <strong className="font-outfit font-semibold text-[#0F0F0F]">{formatCount(counts.followers)}</strong> urmăritori
            </span>
            <span className="text-[12px] text-[#6B6B6B]">
              <strong className="font-outfit font-semibold text-[#0F0F0F]">{formatCount(counts.following)}</strong> urmăresc
            </span>
          </Link>
        )}
        <UserMenu sidebar />
      </div>
    </aside>
  )
}
