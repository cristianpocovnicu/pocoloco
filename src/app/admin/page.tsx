import Link from 'next/link'
import { Users, Pencil, MapPin, AlertTriangle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { countRows, fetchProfilesMap, CONTENT_TYPE_LABELS } from '@/lib/admin'
import { timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'
import FlaggedByVotes from '@/components/admin/FlaggedByVotes'

export const dynamic = 'force-dynamic'

type ReportRow = {
  id: string
  content_type: string
  content_id: string
  reason: string | null
  reporter_id: string | null
  created_at: string
}

type PendingLocation = {
  id: string
  name: string
  city: string | null
  category: string | null
  created_at: string
}

/** Ultimele 7 zile, cheie yyyy-mm-dd în ora locală. */
function lastSevenDays() {
  const days: { key: string; label: string }[] = []
  const LABELS = ['D', 'L', 'Ma', 'Mi', 'J', 'V', 'S']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    days.push({ key, label: LABELS[d.getDay()] })
  }
  return days
}

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default async function AdminOverviewPage() {
  const supabase = createClient()

  const weekAgo = new Date()
  weekAgo.setHours(0, 0, 0, 0)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoIso = weekAgo.toISOString()

  const [
    totalUsers,
    suspendedUsers,
    newUsersWeek,
    totalExperiences,
    reportedExperiences,
    newExperiencesWeek,
    approvedLocations,
    pendingLocations,
    pendingReports,
    signupsRes,
    reportsRes,
    pendingLocationsRes,
  ] = await Promise.all([
    countRows(supabase, 'profiles'),
    countRows(supabase, 'profiles', q => q.eq('status', 'suspended')),
    countRows(supabase, 'profiles', q => q.gte('created_at', weekAgoIso)),
    countRows(supabase, 'experiences'),
    countRows(supabase, 'experiences', q => q.eq('status', 'reported')),
    countRows(supabase, 'experiences', q => q.gte('created_at', weekAgoIso)),
    countRows(supabase, 'locations', q => q.eq('status', 'approved')),
    countRows(supabase, 'locations', q => q.eq('status', 'pending')),
    countRows(supabase, 'reports', q => q.eq('status', 'pending')),
    supabase.from('profiles').select('created_at').gte('created_at', weekAgoIso),
    supabase
      .from('reports')
      .select('id, content_type, content_id, reason, reporter_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('locations')
      .select('id, name, city, category, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const reports = (reportsRes.data || []) as ReportRow[]
  const pendingLocationList = (pendingLocationsRes.data || []) as PendingLocation[]
  const reporters = await fetchProfilesMap(supabase, reports.map(r => r.reporter_id))

  // Grafic useri noi — ultimele 7 zile
  const days = lastSevenDays()
  const buckets: Record<string, number> = Object.fromEntries(days.map(d => [d.key, 0]))
  for (const row of (signupsRes.data || []) as { created_at: string }[]) {
    const key = dayKey(row.created_at)
    if (key in buckets) buckets[key] += 1
  }
  const maxSignups = Math.max(1, ...days.map(d => buckets[d.key]))

  const STATS = [
    {
      label: 'Useri totali',
      value: totalUsers,
      note: suspendedUsers > 0 ? `${suspendedUsers} suspendați` : `+${newUsersWeek} săpt.`,
      good: suspendedUsers === 0,
      Icon: Users,
      iconBg: '#FFF0EB',
      href: '/admin/users',
    },
    {
      label: 'Experiențe',
      value: totalExperiences,
      note: `+${newExperiencesWeek} săpt.`,
      good: true,
      Icon: Pencil,
      iconBg: '#ECFDF5',
      href: '/admin/experiences',
    },
    {
      label: 'Locații aprobate',
      value: approvedLocations,
      note: pendingLocations > 0 ? `${pendingLocations} în așteptare` : 'Nimic de aprobat',
      good: pendingLocations === 0,
      Icon: MapPin,
      iconBg: '#EEEDFB',
      href: '/admin/locations',
    },
    {
      label: 'Raportări active',
      value: pendingReports,
      note: pendingReports > 0 ? 'Necesită atenție' : 'Toate rezolvate',
      good: pendingReports === 0,
      Icon: AlertTriangle,
      iconBg: '#FFFBEB',
      href: '/admin/reports',
    },
  ]

  const today = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div>
      <AdminHeader
        title="Overview"
        right={<span className="hidden md:block text-[12px] text-[#9B9B9B]">{today}</span>}
      />

      <div className="p-5 md:p-6">
        {/* Statistici */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {STATS.map(s => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.15)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.iconBg }}>
                  <s.Icon size={18} className="text-[#0F0F0F]" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.good ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFFBEB] text-[#D97706]'}`}>
                  {s.note}
                </span>
              </div>
              <div className="font-outfit text-[22px] font-bold text-[#0F0F0F]">{s.value.toLocaleString('ro-RO')}</div>
              <div className="text-[11px] text-[#9B9B9B]">{s.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mb-5">
          {/* Grafic useri noi */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Useri noi — ultimele 7 zile</h2>
              <span className="text-[12px] text-[#9B9B9B]">{newUsersWeek} total</span>
            </div>
            <div className="flex items-end gap-2 h-28">
              {days.map((d, i) => {
                const count = buckets[d.key]
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-semibold text-[#6B6B6B]">{count > 0 ? count : ''}</span>
                    <div
                      className="w-full rounded-t-sm min-h-[2px] transition-all"
                      style={{
                        height: `${(count / maxSignups) * 100}%`,
                        background: i === days.length - 1 ? '#E8440A' : 'rgba(232,68,10,0.35)',
                      }}
                    />
                    <span className="text-[9px] text-[#9B9B9B]">{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Locații în așteptare */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Locații de aprobat</h2>
              <Link href="/admin/locations" className="text-[12px] text-[#E8440A] font-medium">Vezi toate →</Link>
            </div>
            {pendingLocationList.length === 0 ? (
              <p className="text-[13px] text-[#9B9B9B] py-6 text-center">Nicio locație în așteptare. 🎉</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingLocationList.map(loc => (
                  <div key={loc.id} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-[#D97706]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#0F0F0F] truncate">{loc.name}</p>
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        {loc.city || 'Fără oraș'}{loc.category ? ` · ${loc.category}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#9B9B9B] flex-shrink-0">{timeAgo(loc.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Semnalate de comunitate — votat negativ, dar încă neraportat */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Semnalate de comunitate</h2>
            <span className="text-[12px] text-[#9B9B9B]">scor net ≤ -3</span>
          </div>
          <FlaggedByVotes />
        </div>

        {/* Raportări recente */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Raportări recente</h2>
            <Link href="/admin/reports" className="text-[12px] text-[#E8440A] font-medium">Vezi toate →</Link>
          </div>
          {reports.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 text-center">
              <p className="text-[13px] text-[#9B9B9B]">Nicio raportare în așteptare.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reports.map(r => {
                const reporter = r.reporter_id ? reporters[r.reporter_id] : null
                return (
                  <div key={r.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-lg flex-shrink-0">🚩</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F0F0F]">
                        {CONTENT_TYPE_LABELS[r.content_type] || r.content_type} raportat{r.content_type === 'location' ? 'ă' : ''}
                      </p>
                      <p className="text-[12px] text-[#6B6B6B] truncate">{r.reason || 'Fără motiv specificat'}</p>
                      <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                        {reporter ? `De la @${reporter.username || 'anonim'}` : 'Raportor necunoscut'} · {timeAgo(r.created_at)}
                      </p>
                    </div>
                    <Link
                      href="/admin/reports"
                      className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                    >
                      Rezolvă
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
