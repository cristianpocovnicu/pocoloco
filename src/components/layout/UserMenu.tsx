'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface UserMenuProps {
  sidebar?: boolean
}

export default function UserMenu({ sidebar }: UserMenuProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) return <div className="w-8 h-8 rounded-full bg-[#F8F7F5] animate-pulse" />

  // Sidebar mode — arată user complet
  if (sidebar) {
    if (!user) return (
      <div className="flex flex-col gap-2">
        <Link href="/register" className="w-full bg-[#E8440A] text-white font-outfit text-[13px] font-semibold py-2.5 rounded-full text-center hover:bg-[#D03D09] transition-colors">
          Cont nou
        </Link>
        <Link href="/login" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[13px] font-medium py-2.5 rounded-full text-center hover:bg-[#F0EDE8] transition-colors">
          Intră în cont
        </Link>
      </div>
    )

    const name = user.user_metadata?.full_name || user.email || 'User'
    const initials = getInitials(name)

    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 w-full cursor-pointer hover:bg-[#F8F7F5] rounded-xl p-1.5 transition-colors">
          <div className="w-9 h-9 rounded-full bg-[#E8440A] flex items-center justify-center font-outfit text-[13px] font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-[#0F0F0F] truncate max-w-[110px]">{name}</div>
            <div className="text-[11px] text-[#9B9B9B] truncate max-w-[110px]">{user.email}</div>
          </div>
          <ChevronDown size={14} className="text-[#9B9B9B] flex-shrink-0" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute bottom-14 left-0 right-0 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-lg z-50 overflow-hidden">
              <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#0F0F0F] hover:bg-[#F8F7F5] transition-colors">
                <UserIcon size={15} className="text-[#6B6B6B]" /> Profilul meu
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                <LogOut size={15} /> Deconectează-te
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Normal mode (pentru mobile topbar dacă e nevoie)
  if (!user) return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="text-[13px] font-outfit font-medium text-[#6B6B6B] px-3 py-1.5 rounded-full border border-[rgba(0,0,0,0.08)] hover:bg-[#F8F7F5] transition-colors">Intră</Link>
      <Link href="/register" className="text-[13px] font-outfit font-semibold text-white bg-[#E8440A] px-3 py-1.5 rounded-full hover:bg-[#D03D09] transition-colors">Cont nou</Link>
    </div>
  )

  const name = user.user_metadata?.full_name || user.email || 'User'
  const initials = getInitials(name)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center font-outfit text-[12px] font-bold text-white">{initials}</div>
        <ChevronDown size={14} className="text-[#6B6B6B]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-lg z-50 min-w-[180px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
              <div className="text-[13px] font-semibold text-[#0F0F0F] truncate">{name}</div>
              <div className="text-[11px] text-[#9B9B9B] truncate">{user.email}</div>
            </div>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#0F0F0F] hover:bg-[#F8F7F5] transition-colors">
              <UserIcon size={15} className="text-[#6B6B6B]" /> Profilul meu
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
              <LogOut size={15} /> Deconectează-te
            </button>
          </div>
        </>
      )}
    </div>
  )
}
