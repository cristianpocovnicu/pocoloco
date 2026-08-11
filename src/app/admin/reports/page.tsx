'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, X, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, statusStyle, CONTENT_TYPE_LABELS, type MiniProfile } from '@/lib/admin'
import { cn, timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'

type ReportRow = {
  id: string
  content_type: string
  content_id: string
  reason: string | null
  reporter_id: string | null
  status: string
  created_at: string
}

/** Rezumatul conținutului raportat, indiferent de tabelul din care vine. */
type Target = {
  title: string
  subtitle: string
  status: string | null
  href: string | null
}

type Filter = 'pending' | 'resolved' | 'dismissed' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'În așteptare' },
  { id: 'resolved', label: 'Rezolvate' },
  { id: 'dismissed', label: 'Respinse' },
  { id: 'all', label: 'Toate' },
]

/** Tabelul + coloana de status folosite când adminul șterge conținutul raportat. */
const MODERATION: Record<string, { table: string; removedStatus: string }> = {
  experience: { table: 'experiences', removedStatus: 'removed' },
  location: { table: 'locations', removedStatus: 'rejected' },
  trip: { table: 'trips', removedStatus: 'removed' },
  user: { table: 'profiles', removedStatus: 'suspended' },
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [targets, setTargets] = useState<Record<string, Target>>({})
  const [reporters, setReporters] = useState<Record<string, MiniProfile>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('reports')
      .select('id, content_type, content_id, reason, reporter_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as ReportRow[]
    setReports(rows)
    setReporters(await fetchProfilesMap(supabase, rows.map(r => r.reporter_id)))

    // Conținutul raportat e polimorf — îl aducem grupat pe tip, cu o singură cerere per tabel
    const idsByType: Record<string, string[]> = {}
    for (const r of rows) {
      if (!r.content_id) continue
      ;(idsByType[r.content_type] ||= []).push(r.content_id)
    }

    const resolved: Record<string, Target> = {}

    const [expRes, locRes, tripRes, userRes] = await Promise.all([
      idsByType.experience?.length
        ? supabase.from('experiences').select('id, content, status').in('id', idsByType.experience)
        : Promise.resolve({ data: [] }),
      idsByType.location?.length
        ? supabase.from('locations').select('id, name, city, status').in('id', idsByType.location)
        : Promise.resolve({ data: [] }),
      idsByType.trip?.length
        ? supabase.from('trips').select('id, title, status').in('id', idsByType.trip)
        : Promise.resolve({ data: [] }),
      idsByType.user?.length
        ? supabase.from('profiles').select('id, username, full_name, avatar_url, status').in('id', idsByType.user)
        : Promise.resolve({ data: [] }),
    ])

    for (const e of (expRes.data || []) as { id: string; content: string | null; status: string }[]) {
      resolved[`experience:${e.id}`] = {
        title: (e.content || 'Experiență fără text').slice(0, 90),
        subtitle: 'Experiență',
        status: e.status,
        href: null,
      }
    }
    for (const l of (locRes.data || []) as { id: string; name: string; city: string | null; status: string }[]) {
      resolved[`location:${l.id}`] = {
        title: l.name,
        subtitle: l.city || 'Locație',
        status: l.status,
        href: `/location/${l.id}`,
      }
    }
    for (const t of (tripRes.data || []) as { id: string; title: string; status: string }[]) {
      resolved[`trip:${t.id}`] = { title: t.title, subtitle: 'Călătorie', status: t.status, href: null }
    }
    for (const u of (userRes.data || []) as { id: string; username: string | null; full_name: string | null; status: string }[]) {
      resolved[`user:${u.id}`] = {
        title: u.full_name || u.username || 'User',
        subtitle: `@${u.username || '—'}`,
        status: u.status,
        href: null,
      }
    }

    setTargets(resolved)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setReportStatus = async (id: string, status: string) => {
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('reports').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
      setError(null)
    }
    setBusyId(null)
  }

  /** Ascunde conținutul raportat și marchează raportul ca rezolvat. */
  const removeContent = async (report: ReportRow) => {
    const config = MODERATION[report.content_type]
    if (!config) {
      setError(`Tip de conținut necunoscut: ${report.content_type}`)
      return
    }
    if (!window.confirm('Ascunzi conținutul raportat și marchezi raportarea ca rezolvată?')) return

    setBusyId(report.id)
    const supabase = createClient()
    const { error: contentError } = await supabase
      .from(config.table)
      .update({ status: config.removedStatus })
      .eq('id', report.content_id)

    if (contentError) {
      setError(contentError.message)
      setBusyId(null)
      return
    }

    const { error: reportError } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id)
    if (reportError) setError(reportError.message)
    else {
      const key = `${report.content_type}:${report.content_id}`
      setReports(prev => prev.map(r => (r.id === report.id ? { ...r, status: 'resolved' } : r)))
      setTargets(prev => (prev[key] ? { ...prev, [key]: { ...prev[key], status: config.removedStatus } } : prev))
      setError(null)
    }
    setBusyId(null)
  }

  const visible = reports.filter(r => filter === 'all' || r.status === filter)
  const counts = {
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
    all: reports.length,
  }

  return (
    <div>
      <AdminHeader
        title="Raportări"
        subtitle={counts.pending > 0 ? `${counts.pending} raportări de tratat` : 'Nicio raportare în așteptare'}
      />

      <div className="p-5 md:p-6">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-[12px] rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-4">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'text-[11px] px-3 py-1.5 rounded-full font-outfit font-medium border whitespace-nowrap flex-shrink-0',
                filter === f.id
                  ? 'bg-[#E8440A] text-white border-[#E8440A]'
                  : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
              )}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#E8440A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] py-16 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-[13px] text-[#9B9B9B]">Nicio raportare în această categorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map(r => {
              const target = targets[`${r.content_type}:${r.content_id}`]
              const reporter = r.reporter_id ? reporters[r.reporter_id] : null
              const reportStyle = statusStyle(r.status)
              const busy = busyId === r.id
              return (
                <div key={r.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-lg flex-shrink-0">🚩</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[13px] font-semibold text-[#0F0F0F]">
                          {CONTENT_TYPE_LABELS[r.content_type] || r.content_type}
                        </span>
                        <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${reportStyle.className}`}>
                          {reportStyle.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6B6B6B]">{r.reason || 'Fără motiv specificat'}</p>
                      <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                        {reporter ? `Raportat de @${reporter.username || reporter.full_name}` : 'Raportor necunoscut'} · {timeAgo(r.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Conținutul raportat */}
                  <div className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.06)] rounded-xl p-3 mb-3">
                    {target ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] text-[#0F0F0F] font-medium line-clamp-2">{target.title}</p>
                          {target.status && (
                            <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyle(target.status).className}`}>
                              {statusStyle(target.status).label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-[#9B9B9B]">{target.subtitle}</span>
                          {target.href && (
                            <Link href={target.href} className="text-[11px] text-[#5B4FCF] font-medium flex items-center gap-0.5">
                              Deschide <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-[12px] text-[#9B9B9B]">Conținutul raportat nu mai există.</p>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {r.status !== 'resolved' && target && (
                      <button
                        disabled={busy}
                        onClick={() => removeContent(r)}
                        className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Ascunde conținutul
                      </button>
                    )}
                    {r.status !== 'dismissed' && (
                      <button
                        disabled={busy}
                        onClick={() => setReportStatus(r.id, 'dismissed')}
                        className="text-[11px] bg-[#F8F7F5] text-[#6B6B6B] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <X size={12} /> Respinge raportarea
                      </button>
                    )}
                    {r.status !== 'resolved' && (
                      <button
                        disabled={busy}
                        onClick={() => setReportStatus(r.id, 'resolved')}
                        className="text-[11px] bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check size={12} /> Marchează rezolvat
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        disabled={busy}
                        onClick={() => setReportStatus(r.id, 'pending')}
                        className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      >
                        Redeschide
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
