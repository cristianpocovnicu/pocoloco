'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { countRows } from '@/lib/admin'
import AdminChrome from './AdminChrome'

type State =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'denied' }
  | { status: 'allowed'; name: string; username: string | null; counts: { pendingReports: number; pendingLocations: number } }

/**
 * Plasă de siguranță pentru cazul în care serverul nu vede sesiunea din
 * cookie-uri, dar browserul o are. Fără ea, un cookie expirat te scotea
 * afară din /admin deși erai logat ca admin.
 *
 * Nu înlocuiește autorizarea: politicile RLS din bază decid ce poate citi
 * și scrie userul, indiferent ce randăm aici.
 */
export default function AdminClientGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'checking' })

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState({ status: 'anonymous' }); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') { setState({ status: 'denied' }); return }

      const [pendingReports, pendingLocations] = await Promise.all([
        countRows(supabase, 'reports', q => q.eq('status', 'pending')),
        countRows(supabase, 'locations', q => q.eq('status', 'pending')),
      ])

      setState({
        status: 'allowed',
        name: profile.full_name || profile.username || 'Admin',
        username: profile.username,
        counts: { pendingReports, pendingLocations },
      })
    }
    check()
  }, [])

  if (state.status === 'checking') return (
    <div className="min-h-screen bg-[#F4F3F1] flex items-center justify-center">
      <Loader2 size={26} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (state.status === 'allowed') return (
    <AdminChrome counts={state.counts} adminName={state.name} adminUsername={state.username}>
      {children}
    </AdminChrome>
  )

  const anonymous = state.status === 'anonymous'

  return (
    <div className="min-h-screen bg-[#F0EDE8] flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-8 max-w-[420px] w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={22} className="text-[#DC2626]" />
        </div>
        <h1 className="font-outfit text-[18px] font-bold text-[#0F0F0F] mb-2">
          {anonymous ? 'Trebuie să fii autentificat' : 'Acces restricționat'}
        </h1>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-5">
          {anonymous
            ? 'Intră în cont cu un utilizator care are rol de admin.'
            : 'Zona de administrare e disponibilă doar conturilor cu rol de admin.'}
        </p>
        <Link
          href={anonymous ? '/login' : '/'}
          className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full"
        >
          {anonymous ? 'Intră în cont' : 'Înapoi la Pocoloco'}
        </Link>
      </div>
    </div>
  )
}
