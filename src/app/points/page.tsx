'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase-client'
import { formatCount, timeAgo } from '@/lib/utils'
import {
  describeEntry,
  fetchLedger,
  fetchLevels,
  fetchPointsSummary,
  levelProgress,
  type LedgerEntry,
  type LevelProgress,
} from '@/lib/points'

export default function PointsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [badgeNames, setBadgeNames] = useState<Record<string, string>>({})
  const [points, setPoints] = useState(0)
  const [progress, setProgress] = useState<LevelProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  /**
   * Numele actorilor și ale insignelor, într-un singur query fiecare —
   * altfel un istoric de 30 de rânduri ar face 60 de cereri.
   */
  const hydrate = useCallback(async (rows: LedgerEntry[]) => {
    const supabase = createClient()

    const actorIds = Array.from(new Set(
      rows.filter(r => r.recipient_id !== null).map(r => r.actor_id)
    ))
    if (actorIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', actorIds)
      const map: Record<string, string> = {}
      for (const p of (data || []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]) {
        map[p.id] = p.full_name || (p.username ? `@${p.username}` : 'Cineva')
      }
      setNames(prev => ({ ...prev, ...map }))
    }

    const badgeIds = Array.from(new Set(
      rows
        .filter(r => r.action_type === 'milestone')
        .map(r => (r.meta?.badge_id as string) || '')
        .filter(Boolean)
    ))
    if (badgeIds.length > 0) {
      const { data } = await supabase.from('badges').select('id, name').in('id', badgeIds)
      const map: Record<string, string> = {}
      for (const b of (data || []) as { id: string; name: string }[]) map[b.id] = b.name
      setBadgeNames(prev => ({ ...prev, ...map }))
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [summary, levels, page] = await Promise.all([
        fetchPointsSummary(supabase, user.id),
        fetchLevels(supabase),
        fetchLedger(supabase, user.id),
      ])

      setPoints(summary.points)
      setProgress(levelProgress(levels, summary.points))
      setEntries(page.entries)
      setHasMore(!page.done)
      // zero puncte și zero istoric: cel mai probabil migrarea nu e rulată
      setNeedsMigration(summary.points === 0 && page.entries.length === 0)
      await hydrate(page.entries)
      setLoading(false)
    }
    load()
  }, [router, hydrate])

  const loadMore = async () => {
    if (loadingMore || !hasMore || entries.length === 0) return
    setLoadingMore(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const page = await fetchLedger(supabase, user.id, entries[entries.length - 1].created_at)
      setEntries(prev => [...prev, ...page.entries])
      setHasMore(!page.done)
      await hydrate(page.entries)
    }
    setLoadingMore(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
          aria-label="Înapoi"
        >
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Punctele mele</span>
      </div>

      <div className="max-w-[780px] mx-auto">
        {/* Rezumat */}
        <div className="bg-white px-5 py-5 border-b border-[rgba(0,0,0,0.08)]">
          <p className="font-outfit text-[32px] font-bold text-[#0F0F0F] leading-none">
            {formatCount(points)}
          </p>
          <p className="text-[13px] text-[#6B6B6B] mb-3">
            {progress ? `Nivel ${progress.level} · ${progress.name}` : 'puncte'}
          </p>

          {progress && (
            <>
              <div className="h-2 bg-[#F1F1F1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#E8440A] to-[#F97316] rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[12px] text-[#9B9B9B] mt-1.5">
                {progress.toNext !== null
                  ? `Încă ${formatCount(progress.toNext)} puncte până la nivelul ${progress.level + 1}.`
                  : 'Ai ajuns la ultimul nivel din curbă.'}
              </p>
            </>
          )}
        </div>

        <div className="px-5 pt-4">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-3">Istoric</h2>

          {entries.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-5 py-8 text-center">
              <div className="text-3xl mb-1.5">⭐</div>
              <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-0.5">
                Niciun punct încă
              </p>
              <p className="text-[12px] text-[#9B9B9B] leading-relaxed mb-3">
                {needsMigration
                  ? 'Publică o experiență, salvează un loc sau urmărește un călător — punctele apar aici.'
                  : 'Punctele apar aici pe măsură ce contribui.'}
              </p>
              <Link
                href="/create"
                className="inline-flex bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-2 rounded-full"
              >
                Adaugă ceva
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map(entry => {
                const described = describeEntry(
                  entry,
                  names[entry.actor_id],
                  (entry.meta?.badge_id as string) ? badgeNames[entry.meta!.badge_id as string] : null
                )
                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-[18px] flex-shrink-0">{described.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#0F0F0F] leading-snug">{described.text}</p>
                      <p className="text-[11px] text-[#9B9B9B]">{timeAgo(entry.created_at)}</p>
                    </div>
                    <span className="font-outfit text-[14px] font-bold text-[#059669] flex-shrink-0">
                      +{entry.points}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {hasMore && entries.length > 0 && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-3 bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[13px] font-medium rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={13} className="animate-spin" />}
              Încarcă mai multe
            </button>
          )}

          <p className="text-[11px] text-[#9B9B9B] leading-relaxed mt-4">
            Punctele vin din ce contribui și din cât de utile sunt contribuțiile tale pentru
            ceilalți. Un conținut salvat sau distribuit de alții aduce mai mult decât unul
            postat și uitat.
          </p>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
