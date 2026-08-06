'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchLevels, fetchPointsSummary, levelProgress, type LevelProgress } from '@/lib/points'
import { formatCount } from '@/lib/utils'

/**
 * Progresul pe economia de puncte, pe profilul propriu.
 *
 * Discret intenționat: e o măsură a contribuției, nu scopul aplicației.
 * Duce la /points, unde scrie exact de unde vine fiecare punct.
 */
export default function PointsProgress({ userId }: { userId: string }) {
  const [points, setPoints] = useState(0)
  const [progress, setProgress] = useState<LevelProgress | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const [summary, levels] = await Promise.all([
        fetchPointsSummary(supabase, userId),
        fetchLevels(supabase),
      ])
      if (!active) return
      setPoints(summary.points)
      setProgress(levelProgress(levels, summary.points))
    }
    load()
    return () => { active = false }
  }, [userId])

  if (!progress) return null

  return (
    <div className="px-5 pt-4">
      <Link
        href="/points"
        className="block bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-4 py-3.5 hover:border-[rgba(0,0,0,0.15)] transition-colors"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">
              Nivel {progress.level} · {progress.name}
            </p>
            <p className="text-[12px] text-[#9B9B9B]">
              {formatCount(points)} {points === 1 ? 'punct' : 'puncte'}
              {progress.toNext !== null && ` · încă ${formatCount(progress.toNext)} până la nivelul ${progress.level + 1}`}
            </p>
          </div>
          <ChevronRight size={16} className="text-[#9B9B9B] flex-shrink-0" />
        </div>

        <div className="h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E8440A] to-[#F97316] rounded-full transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {progress.unlock && (
          <p className="text-[11px] text-[#9B9B9B] mt-1.5">Deblocat la nivelul ăsta: {progress.unlock}</p>
        )}
      </Link>
    </div>
  )
}
