'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, ShieldCheck, ShieldOff, Ban, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf, statusStyle } from '@/lib/admin'
import { cn, timeAgo, formatCount } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'

type UserRow = {
  id: string
  username: string | null
  full_name: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  is_guide: boolean | null
  xp: number | null
  created_at: string
}

type Filter = 'all' | 'active' | 'suspended' | 'admin'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toți' },
  { id: 'active', label: 'Activi' },
  { id: 'suspended', label: 'Suspendați' },
  { id: 'admin', label: 'Admini' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [expCounts, setExpCounts] = useState<Record<string, number>>({})
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({})
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user?.id ?? null)

    const [profilesRes, expRes, followsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, full_name, role, status, is_guide, xp, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('experiences').select('author_id').limit(5000),
      supabase.from('follows').select('following_id').limit(5000),
    ])

    if (profilesRes.error) {
      setError(profilesRes.error.message)
      setLoading(false)
      return
    }

    const exp: Record<string, number> = {}
    for (const row of (expRes.data || []) as { author_id: string }[]) {
      if (row.author_id) exp[row.author_id] = (exp[row.author_id] || 0) + 1
    }
    const followers: Record<string, number> = {}
    for (const row of (followsRes.data || []) as { following_id: string }[]) {
      if (row.following_id) followers[row.following_id] = (followers[row.following_id] || 0) + 1
    }

    setUsers((profilesRes.data || []) as UserRow[])
    setExpCounts(exp)
    setFollowerCounts(followers)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateUser = async (id: string, patch: Partial<UserRow>, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)))
      setError(null)
    }
    setBusyId(null)
  }

  const q = query.trim().toLowerCase()
  const visible = users.filter(u => {
    if (filter === 'active' && u.status !== 'active') return false
    if (filter === 'suspended' && u.status !== 'suspended') return false
    if (filter === 'admin' && u.role !== 'admin') return false
    if (!q) return true
    return (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)
  })

  const counts = {
    all: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    admin: users.filter(u => u.role === 'admin').length,
  }

  return (
    <div>
      <AdminHeader title="Useri" subtitle={`${users.length} conturi înregistrate`} />

      <div className="p-5 md:p-6">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-[12px] rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
          <div className="p-3 border-b border-[rgba(0,0,0,0.08)] flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'text-[11px] px-3 py-1.5 rounded-full font-outfit font-medium border whitespace-nowrap flex-shrink-0',
                    filter === f.id
                      ? 'bg-[#E8440A] text-white border-[#E8440A]'
                      : 'bg-[#F8F7F5] text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
                  )}
                >
                  {f.label} ({counts[f.id]})
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1.5">
              <Search size={13} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9B9B9B]"
                placeholder="Caută după nume sau username..."
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 size={24} className="animate-spin text-[#E8440A]" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[#9B9B9B]">Niciun user găsit.</p>
          ) : (
            <>
              {/* Cap de tabel — doar desktop */}
              <div className="hidden md:flex bg-[#F8F7F5] border-b border-[rgba(0,0,0,0.08)] px-4 py-2.5 text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wide">
                <div className="flex-1">User</div>
                <div className="w-24">Experiențe</div>
                <div className="w-24">Urmăritori</div>
                <div className="w-28">Înscris</div>
                <div className="w-24">Status</div>
                <div className="w-48 text-right">Acțiuni</div>
              </div>

              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {visible.map(u => {
                  const isMe = u.id === meId
                  const busy = busyId === u.id
                  const style = statusStyle(u.status)
                  return (
                    <div key={u.id} className="flex flex-col md:flex-row md:items-center px-4 py-3 gap-2 hover:bg-[rgba(0,0,0,0.01)]">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                          style={{ background: colorFor(u.id) }}
                        >
                          {initialsOf(u.full_name || u.username)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[#0F0F0F] truncate flex items-center gap-1.5">
                            {u.full_name || 'Fără nume'}
                            {u.role === 'admin' && (
                              <span className="text-[9px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#EEEDFB] text-[#5B4FCF]">ADMIN</span>
                            )}
                            {u.is_guide && (
                              <span className="text-[9px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706]">GHID</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9B9B9B] truncate">@{u.username || '—'}</div>
                        </div>
                      </div>

                      <div className="md:w-24 text-[12px] md:text-[13px] text-[#6B6B6B] md:text-[#0F0F0F]">
                        <span className="md:hidden text-[#9B9B9B]">Experiențe: </span>
                        {formatCount(expCounts[u.id] || 0)}
                      </div>
                      <div className="md:w-24 text-[12px] md:text-[13px] text-[#6B6B6B] md:text-[#0F0F0F]">
                        <span className="md:hidden text-[#9B9B9B]">Urmăritori: </span>
                        {formatCount(followerCounts[u.id] || 0)}
                      </div>
                      <div className="md:w-28 text-[11px] md:text-[12px] text-[#9B9B9B]">{timeAgo(u.created_at)}</div>
                      <div className="md:w-24">
                        <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${style.className}`}>
                          {style.label}
                        </span>
                      </div>

                      <div className="md:w-48 flex gap-1.5 md:justify-end flex-wrap">
                        {isMe ? (
                          <span className="text-[11px] text-[#9B9B9B] px-2 py-1">Contul tău</span>
                        ) : (
                          <>
                            {u.role === 'admin' ? (
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { role: 'user' }, `Scoți drepturile de admin pentru ${u.full_name || u.username}?`)}
                                className="text-[11px] bg-[#F8F7F5] text-[#6B6B6B] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                <ShieldOff size={11} /> Scoate admin
                              </button>
                            ) : (
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { role: 'admin' }, `Faci admin pe ${u.full_name || u.username}?`)}
                                className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                <ShieldCheck size={11} /> Fă admin
                              </button>
                            )}
                            {u.status === 'suspended' ? (
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { status: 'active' }, `Reactivezi contul ${u.full_name || u.username}?`)}
                                className="text-[11px] bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                <RotateCcw size={11} /> Reactivează
                              </button>
                            ) : (
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { status: 'suspended' }, `Suspenzi contul ${u.full_name || u.username}?`)}
                                className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                <Ban size={11} /> Suspendă
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {users.length >= 200 && (
          <p className="text-[11px] text-[#9B9B9B] mt-3">Se afișează cei mai recenți 200 de useri.</p>
        )}
      </div>
    </div>
  )
}
