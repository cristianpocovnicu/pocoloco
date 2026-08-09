'use client'
import Link from 'next/link'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { useCurrentProfile } from '@/lib/useCurrentProfile'
import { useModerationQueue } from '@/lib/useModerationQueue'

/**
 * Drumul spre dashboard, de pe telefon.
 *
 * Pe desktop intrarea stă în sidebar; pe mobil sidebar-ul e ascuns, iar
 * bara de jos are cele cinci locuri ale ei și rămâne neatinsă. Aici, în
 * capul propriului profil, e locul în care omul se uită oricum când vrea
 * „ale mele".
 *
 * Se ascunde singură pentru conturile fără rol de admin — și, ca peste tot,
 * numărul apare doar dacă e ceva de făcut.
 */
export default function AdminEntry() {
  const { profile } = useCurrentProfile()
  const isAdmin = profile?.role === 'admin'
  const toModerate = useModerationQueue(isAdmin)

  if (!isAdmin) return null

  return (
    <Link
      href="/admin"
      className="md:hidden bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-xl bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
        <ShieldCheck size={18} className="text-[#5B4FCF]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">Administrare</p>
        <p className="text-[12px] text-[#9B9B9B]">
          {toModerate > 0
            ? `${toModerate} ${toModerate === 1 ? 'lucru așteaptă' : 'lucruri așteaptă'} moderarea`
            : 'Nimic de moderat acum'}
        </p>
      </div>
      {toModerate > 0 && (
        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#DC2626] text-white text-[12px] font-outfit font-bold flex items-center justify-center flex-shrink-0">
          {toModerate > 99 ? '99+' : toModerate}
        </span>
      )}
      <ChevronRight size={16} className="text-[#C9C5BD] flex-shrink-0" />
    </Link>
  )
}
