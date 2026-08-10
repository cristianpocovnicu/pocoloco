'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { timeAgo } from '@/lib/utils'
import { MAX_DRAFTS, listDrafts, stopLabel, type DraftRow } from '@/lib/story'

/**
 * Poveștile la care ai rămas, pe profilul propriu.
 *
 * Nu apar pe profilul public: un draft e strict al autorului (RLS îl
 * ascunde oricum), iar aici e doar drumul înapoi în flux.
 *
 * De la trei sloturi (migrarea 46), fiecare rând duce în ciorna lui —
 * un link către flux care nu spune care ar fi însemnat să alegi din nou.
 */
export default function UnfinishedStory({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const rows = await listDrafts(createClient(), userId)
      if (active) setDrafts(rows)
    }
    load()
    return () => { active = false }
  }, [userId])

  if (drafts.length === 0) return null

  return (
    <div className="px-5 pt-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F]">
          {drafts.length === 1 ? 'Poveste neterminată' : 'Povești neterminate'}
        </p>
        <span className="text-[12px] text-[#9B9B9B]">{drafts.length} din {MAX_DRAFTS}</span>
      </div>

      <div className="flex flex-col gap-2">
        {drafts.map(row => {
          const title = row.draft.trip.title.trim() || stopLabel(row.draft.stops[0])

          return (
            <Link
              key={row.id}
              href={`/add-experience?draft=${row.id}`}
              className="bg-white border border-dashed border-[rgba(232,68,10,0.35)] rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-[rgba(232,68,10,0.6)] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
                <PenLine size={16} className="text-[#E8440A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
                  {title || 'Fără titlu'}
                </p>
                <p className="text-[12px] text-[#9B9B9B] truncate">
                  {row.draft.stops.length} {row.draft.stops.length === 1 ? 'loc' : 'locuri'} · {timeAgo(row.updatedAt)}
                </p>
              </div>
              <ChevronRight size={16} className="text-[#9B9B9B] flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
