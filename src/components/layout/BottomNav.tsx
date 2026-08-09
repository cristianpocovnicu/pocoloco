'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, BookOpen, Plus, User } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useCurrentProfile } from '@/lib/useCurrentProfile'
import { useModerationQueue } from '@/lib/useModerationQueue'

const NAV_ITEMS = [
  { href: '/', label: 'Acasă', Icon: Home },
  { href: '/search', label: 'Caută', Icon: Search },
  { href: '/add-experience', label: 'Povestește', Icon: Plus },
  { href: '/trips', label: 'Călătorii', Icon: BookOpen },
]

/**
 * Bara de jos, pe mobil. Ultima intrare e profilul, cu avatarul userului —
 * fără ea, profilul propriu nu se putea atinge deloc de pe telefon.
 *
 * Notificările au ieșit de aici: stau acum în clopoțelul din headerele
 * paginilor principale, ca să rămână loc pentru profil.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const { profile } = useCurrentProfile()
  const toModerate = useModerationQueue(profile?.role === 'admin')

  const profileActive = pathname === '/profile'

  return (
    <nav className="bottom-nav-mobile fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center justify-around px-1 pt-2.5 pb-6 max-w-[520px] mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors',
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

        <Link
          href={profile ? '/profile' : '/login'}
          className={cn(
            'relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors',
            profileActive ? 'text-[#E8440A]' : 'text-[#9B9B9B]'
          )}
        >
          {/* Ecoul cozii de moderare: doar punctul, fără număr — numărul îl
              vezi pe rândul „Admin" din profil. Iconița de profil n-are alt
              badge (notificările stau în clopoțelul din headere), deci nu se
              bate cu nimic. */}
          {toModerate > 0 && (
            <span className="absolute top-0 right-2 w-2.5 h-2.5 bg-[#DC2626] rounded-full border-2 border-white" />
          )}
          <span
            className={cn(
              'w-6 h-6 rounded-full overflow-hidden flex items-center justify-center',
              // inelul portocaliu ține locul îngroșării pe care o au celelalte iconițe
              profileActive && 'ring-2 ring-[#E8440A] ring-offset-1'
            )}
          >
            {profile?.avatarUrl ? (
              // <img>, nu next/image: avatarul are 24px și apare pe fiecare
              // pagină, iar sursa poate veni de la orice furnizor OAuth —
              // n-are rost să depindă de lista de domenii din next.config
              <img
                src={profile.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 object-cover"
              />
            ) : profile ? (
              <span className="w-6 h-6 bg-[#E8440A] text-white text-[9px] font-bold flex items-center justify-center">
                {getInitials(profile.fullName || profile.username || '?')}
              </span>
            ) : (
              <User size={22} strokeWidth={profileActive ? 2.5 : 1.8} />
            )}
          </span>
          <span className={cn('text-[10px] font-outfit', profileActive ? 'font-semibold text-[#E8440A]' : 'text-[#9B9B9B]')}>
            {profile ? 'Profil' : 'Cont'}
          </span>
        </Link>
      </div>
    </nav>
  )
}
