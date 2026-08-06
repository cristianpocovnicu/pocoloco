import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { countRows, type AdminProfile } from '@/lib/admin'
import AdminChrome from '@/components/admin/AdminChrome'
import AdminClientGate from '@/components/admin/AdminClientGate'

export const dynamic = 'force-dynamic'

function Blocked({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#F0EDE8] flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-8 max-w-[420px] w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={22} className="text-[#DC2626]" />
        </div>
        <h1 className="font-outfit text-[18px] font-bold text-[#0F0F0F] mb-2">{title}</h1>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-5">{message}</p>
        <Link href="/" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
          Înapoi la Pocoloco
        </Link>
      </div>
    </div>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Serverul nu vede sesiunea (cookie expirat sau necitit) — nu-l dăm afară,
  // lăsăm browserul să verifice, acolo unde sesiunea sigur există.
  if (!user) {
    return <AdminClientGate>{children}</AdminClientGate>
  }

  // Rolul nu vine niciodată în tokenul de auth: îl citim din profiles.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, status')
    .eq('id', user.id)
    .maybeSingle()

  // Coloanele role/status lipsesc => migrarea nu a fost rulată încă
  if (error) {
    return (
      <Blocked
        title="Baza de date nu e pregătită"
        message="Rulează supabase/migrations/20260806_admin_dashboard.sql în Supabase → SQL Editor, apoi setează-ți rolul de admin."
      />
    )
  }

  const admin = profile as AdminProfile | null

  // Profilul poate lipsi dacă RLS nu-l lasă citit de pe server; și aici
  // browserul are ultimul cuvânt, în loc să blocăm pe loc.
  if (!admin) {
    return <AdminClientGate>{children}</AdminClientGate>
  }

  if (admin.role !== 'admin') {
    return (
      <Blocked
        title="Acces restricționat"
        message="Zona de administrare e disponibilă doar conturilor cu rol de admin."
      />
    )
  }

  const [pendingReports, pendingLocations] = await Promise.all([
    countRows(supabase, 'reports', q => q.eq('status', 'pending')),
    countRows(supabase, 'locations', q => q.eq('status', 'pending')),
  ])

  return (
    <AdminChrome
      counts={{ pendingReports, pendingLocations }}
      adminName={admin.full_name || admin.username || 'Admin'}
      adminUsername={admin.username}
    >
      {children}
    </AdminChrome>
  )
}
