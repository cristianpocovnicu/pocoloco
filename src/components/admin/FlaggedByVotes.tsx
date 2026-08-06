'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, EyeOff, Loader2, MessageCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchProfilesMap, type MiniProfile } from '@/lib/admin'
import { timeAgo } from '@/lib/utils'

const THRESHOLD = -3

type FlaggedItem = {
  kind: 'experience' | 'comment'
  id: string
  content: string
  authorId: string
  netScore: number
  upvotes: number
  downvotes: number
  createdAt: string
  /** unde duce, ca adminul să vadă contextul */
  href: string | null
}

/**
 * Conținut pe care comunitatea l-a votat puternic negativ. Nu e o
 * raportare explicită, dar de obicei ajunge acolo înaintea uneia — de
 * asta stă pe overview, ca avertisment timpuriu.
 */
export default function FlaggedByVotes() {
  const [items, setItems] = useState<FlaggedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()

    const [expRes, commentRes] = await Promise.all([
      supabase
        .from('experiences')
        .select('id, content, author_id, upvotes, downvotes, net_score, created_at, location_id, status')
        .lte('net_score', THRESHOLD)
        .neq('status', 'removed')
        .order('net_score', { ascending: true })
        .limit(10),
      supabase
        .from('comments')
        .select('id, content, author_id, upvotes, downvotes, net_score, created_at, experience_id')
        .lte('net_score', THRESHOLD)
        .order('net_score', { ascending: true })
        .limit(10),
    ])

    // coloana net_score vine din migrarea 20260807; până e rulată, secțiunea tace
    if (expRes.error || commentRes.error) {
      setItems([])
      setLoading(false)
      return
    }

    type ExpRow = { id: string; content: string | null; author_id: string; upvotes: number; downvotes: number; net_score: number; created_at: string; location_id: string }
    type CommentRow = { id: string; content: string; author_id: string; upvotes: number; downvotes: number; net_score: number; created_at: string; experience_id: string }

    const experiences = (expRes.data || []) as ExpRow[]
    const comments = (commentRes.data || []) as CommentRow[]

    // comentariile trimit la locația experienței comentate
    const experienceIds = comments.map(c => c.experience_id)
    const locationByExperience: Record<string, string> = {}
    if (experienceIds.length > 0) {
      const { data } = await supabase
        .from('experiences')
        .select('id, location_id')
        .in('id', experienceIds)
      for (const row of (data || []) as { id: string; location_id: string }[]) {
        locationByExperience[row.id] = row.location_id
      }
    }

    const merged: FlaggedItem[] = [
      ...experiences.map(e => ({
        kind: 'experience' as const,
        id: e.id,
        content: e.content || '',
        authorId: e.author_id,
        netScore: e.net_score,
        upvotes: e.upvotes,
        downvotes: e.downvotes,
        createdAt: e.created_at,
        href: e.location_id ? `/location/${e.location_id}` : null,
      })),
      ...comments.map(c => ({
        kind: 'comment' as const,
        id: c.id,
        content: c.content,
        authorId: c.author_id,
        netScore: c.net_score,
        upvotes: c.upvotes,
        downvotes: c.downvotes,
        createdAt: c.created_at,
        href: locationByExperience[c.experience_id] ? `/location/${locationByExperience[c.experience_id]}` : null,
      })),
    ].sort((a, b) => a.netScore - b.netScore)

    setItems(merged)
    setAuthors(await fetchProfilesMap(supabase, merged.map(i => i.authorId)))
    setLoading(false)
  }, [])

  const [authors, setAuthors] = useState<Record<string, MiniProfile>>({})

  useEffect(() => { load() }, [load])

  const hideExperience = async (item: FlaggedItem) => {
    setBusyId(item.id)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('experiences')
      .update({ status: 'removed' })
      .eq('id', item.id)

    if (updateError) setError(updateError.message)
    else setItems(prev => prev.filter(i => i.id !== item.id))
    setBusyId(null)
  }

  const remove = async (item: FlaggedItem) => {
    const label = item.kind === 'experience' ? 'experiența' : 'comentariul'
    if (!window.confirm(`Ștergi definitiv ${label}? Acțiunea nu poate fi anulată.`)) return

    setBusyId(item.id)
    const supabase = createClient()
    const table = item.kind === 'experience' ? 'experiences' : 'comments'
    const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id)

    if (deleteError) setError(deleteError.message)
    else setItems(prev => prev.filter(i => i.id !== item.id))
    setBusyId(null)
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (items.length === 0) return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 text-center">
      <p className="text-[13px] text-[#9B9B9B]">Nimic semnalat de comunitate. 👌</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-[12px] rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {items.map(item => {
        const author = authors[item.authorId]
        const busy = busyId === item.id

        return (
          <div key={`${item.kind}-${item.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
              {item.kind === 'comment'
                ? <MessageCircle size={16} className="text-[#DC2626]" />
                : <ArrowDown size={16} className="text-[#DC2626]" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[13px] font-semibold text-[#0F0F0F]">
                  {item.kind === 'experience' ? 'Experiență' : 'Comentariu'}
                </span>
                <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">
                  {item.netScore} scor
                </span>
                <span className="text-[11px] text-[#9B9B9B]">
                  {item.upvotes} sus · {item.downvotes} jos
                </span>
              </div>
              <p className="text-[12px] text-[#6B6B6B] line-clamp-2">{item.content}</p>
              <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                {author ? `@${author.username || author.full_name}` : 'autor necunoscut'} · {timeAgo(item.createdAt)}
              </p>
            </div>

            <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {item.href && (
                <Link
                  href={item.href}
                  className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium"
                >
                  Vezi
                </Link>
              )}
              {item.kind === 'experience' && (
                <button
                  disabled={busy}
                  onClick={() => hideExperience(item)}
                  className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <EyeOff size={11} /> Ascunde
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => remove(item)}
                className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Șterge
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
