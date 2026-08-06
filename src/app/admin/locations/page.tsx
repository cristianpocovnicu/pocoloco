'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, Check, X, Trash2, RotateCcw, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, statusStyle, type MiniProfile } from '@/lib/admin'
import { cn, timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'
import CoverImage from '@/components/ui/CoverImage'

type LocationRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  status: 'pending' | 'approved' | 'rejected'
  added_by: string | null
  experience_count: number | null
  cover_image: string | null
  created_at: string
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'În așteptare' },
  { id: 'approved', label: 'Aprobate' },
  { id: 'rejected', label: 'Respinse' },
  { id: 'all', label: 'Toate' },
]

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, city, country, category, status, added_by, experience_count, cover_image, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as LocationRow[]
    setLocations(rows)
    setAuthors(await fetchProfilesMap(supabase, rows.map(r => r.added_by)))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: string, status: LocationRow['status']) => {
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('locations').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setLocations(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
      setError(null)
    }
    setBusyId(null)
  }

  const remove = async (loc: LocationRow) => {
    if (!window.confirm(`Ștergi definitiv locația „${loc.name}"? Experiențele legate de ea rămân fără locație.`)) return
    setBusyId(loc.id)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('locations').delete().eq('id', loc.id)
    if (deleteError) setError(deleteError.message)
    else {
      setLocations(prev => prev.filter(l => l.id !== loc.id))
      setError(null)
    }
    setBusyId(null)
  }

  const q = query.trim().toLowerCase()
  const visible = locations.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (!q) return true
    return l.name.toLowerCase().includes(q) || (l.city || '').toLowerCase().includes(q)
  })

  const counts = {
    pending: locations.filter(l => l.status === 'pending').length,
    approved: locations.filter(l => l.status === 'approved').length,
    rejected: locations.filter(l => l.status === 'rejected').length,
    all: locations.length,
  }

  return (
    <div>
      <AdminHeader
        title="Locații"
        subtitle={counts.pending > 0 ? `${counts.pending} locații așteaptă aprobarea` : 'Nicio locație în așteptare'}
      />

      <div className="p-5 md:p-6">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-[12px] rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
          <div className="flex-1 flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1.5">
            <Search size={13} className="text-[#9B9B9B] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9B9B9B]"
              placeholder="Caută locație sau oraș..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#E8440A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] py-16 text-center">
            <p className="text-[13px] text-[#9B9B9B]">Nicio locație în această categorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map(loc => {
              const author = loc.added_by ? authors[loc.added_by] : null
              const style = statusStyle(loc.status)
              const busy = busyId === loc.id
              return (
                <div key={loc.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {loc.cover_image
                      ? <CoverImage src={loc.cover_image} sizes="48px" />
                      : <MapPin size={18} className="text-[#9B9B9B]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{loc.name}</h3>
                      <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${style.className}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6B6B6B] truncate">
                      📍 {loc.city || 'Fără oraș'}{loc.country ? `, ${loc.country}` : ''}
                      {loc.category ? ` · ${loc.category}` : ''}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                      Adăugată de {author ? `@${author.username || author.full_name}` : 'user necunoscut'} · {timeAgo(loc.created_at)}
                      {loc.experience_count ? ` · ${loc.experience_count} experiențe` : ''}
                    </p>
                  </div>

                  <div className="flex gap-1.5 flex-wrap md:justify-end flex-shrink-0">
                    {loc.status !== 'approved' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'approved')}
                        className="text-[11px] bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check size={12} /> Aprobă
                      </button>
                    )}
                    {loc.status !== 'rejected' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'rejected')}
                        className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <X size={12} /> Respinge
                      </button>
                    )}
                    {loc.status !== 'pending' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(loc.id, 'pending')}
                        className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw size={12} /> În așteptare
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => remove(loc)}
                      className="text-[11px] bg-[#F8F7F5] text-[#6B6B6B] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Șterge
                    </button>
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
