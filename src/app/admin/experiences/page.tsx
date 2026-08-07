'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, EyeOff, RotateCcw, Trash2, Star, ArrowUp, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf, fetchProfilesMap, statusStyle, type MiniProfile } from '@/lib/admin'
import { cn, timeAgo } from '@/lib/utils'
import AdminHeader from '@/components/admin/AdminHeader'
import Image from 'next/image'

type ExperienceRow = {
  id: string
  content: string | null
  images: string[] | null
  status: string
  author_id: string | null
  rating_experience: number | null
  upvotes: number | null
  comment_count: number | null
  created_at: string
  location: { id: string; name: string; city: string | null } | null
}

type Filter = 'all' | 'active' | 'reported' | 'removed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'active', label: 'Active' },
  { id: 'reported', label: 'Raportate' },
  { id: 'removed', label: 'Ascunse' },
]

export default function AdminExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('experiences')
      .select('id, content, images, status, author_id, rating_experience, upvotes, comment_count, created_at, location:locations!location_id(id, name, city)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as unknown as ExperienceRow[]
    setExperiences(rows)
    setAuthors(await fetchProfilesMap(supabase, rows.map(r => r.author_id)))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: string, status: string) => {
    setBusyId(id)
    const supabase = createClient()
    const { error: updateError } = await supabase.from('experiences').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setExperiences(prev => prev.map(e => (e.id === id ? { ...e, status } : e)))
      setError(null)
    }
    setBusyId(null)
  }

  const remove = async (id: string) => {
    if (!window.confirm('Ștergi definitiv această experiență? Acțiunea nu poate fi anulată.')) return
    setBusyId(id)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('experiences').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else {
      setExperiences(prev => prev.filter(e => e.id !== id))
      setError(null)
    }
    setBusyId(null)
  }

  const q = query.trim().toLowerCase()
  const visible = experiences.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false
    if (!q) return true
    return (e.content || '').toLowerCase().includes(q) || (e.location?.name || '').toLowerCase().includes(q)
  })

  const counts = {
    all: experiences.length,
    active: experiences.filter(e => e.status === 'active').length,
    reported: experiences.filter(e => e.status === 'reported').length,
    removed: experiences.filter(e => e.status === 'removed').length,
  }

  return (
    <div>
      <AdminHeader title="Experiențe" subtitle={`${experiences.length} experiențe recente`} />

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
              placeholder="Caută în conținut sau locație..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#E8440A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] py-16 text-center">
            <p className="text-[13px] text-[#9B9B9B]">Nicio experiență în această categorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map(exp => {
              const author = exp.author_id ? authors[exp.author_id] : null
              const style = statusStyle(exp.status)
              const busy = busyId === exp.id
              return (
                <div key={exp.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: colorFor(exp.author_id || exp.id) }}
                    >
                      {initialsOf(author?.full_name || author?.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#0F0F0F]">
                          {author?.full_name || author?.username || 'User șters'}
                        </span>
                        <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${style.className}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9B9B9B]">
                        {exp.location
                          ? <Link href={`/location/${exp.location.id}`} className="hover:text-[#E8440A]">📍 {exp.location.name}</Link>
                          : '📍 Locație ștearsă'} · {timeAgo(exp.created_at)}
                      </p>
                    </div>
                    {exp.rating_experience ? (
                      <div className="flex gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            size={11}
                            className={i <= (exp.rating_experience || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9B9B9B] flex-shrink-0">fără notă</span>
                    )}
                  </div>

                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2 line-clamp-3 whitespace-pre-line">{exp.content}</p>

                  {exp.images && exp.images.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {exp.images.slice(0, 4).map((img, i) => (
                        <Image key={i} src={img} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 text-[11px] text-[#9B9B9B]">
                      <span className="flex items-center gap-0.5"><ArrowUp size={11} /> {exp.upvotes || 0}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {exp.comment_count || 0}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {exp.status === 'removed' ? (
                        <button
                          disabled={busy}
                          onClick={() => setStatus(exp.id, 'active')}
                          className="text-[11px] bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCcw size={12} /> Restaurează
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => setStatus(exp.id, 'removed')}
                          className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <EyeOff size={12} /> Ascunde
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => remove(exp.id)}
                        className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Șterge
                      </button>
                    </div>
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
