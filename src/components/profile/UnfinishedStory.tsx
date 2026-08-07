'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { loadDraft, stopLabel, type StoryDraft } from '@/lib/story'

/**
 * Povestea la care ai rămas, pe profilul propriu.
 *
 * Nu apare pe profilul public: un draft e strict al autorului (RLS îl
 * ascunde oricum), iar aici e doar drumul înapoi în flux.
 */
export default function UnfinishedStory({ userId }: { userId: string }) {
  const [draft, setDraft] = useState<StoryDraft | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const data = await loadDraft(createClient(), userId)
      if (active) setDraft(data)
    }
    load()
    return () => { active = false }
  }, [userId])

  if (!draft || draft.stops.length === 0) return null

  const first = stopLabel(draft.stops[0])
  const rest = draft.stops.length - 1

  return (
    <div className="px-5 pt-4">
      <Link
        href="/add-experience"
        className="block bg-white border border-dashed border-[rgba(232,68,10,0.35)] rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-[rgba(232,68,10,0.6)] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
          <PenLine size={16} className="text-[#E8440A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">Poveste neterminată</p>
          <p className="text-[12px] text-[#9B9B9B] truncate">
            {first}{rest > 0 ? ` + încă ${rest}` : ''}
          </p>
        </div>
        <ChevronRight size={16} className="text-[#9B9B9B] flex-shrink-0" />
      </Link>
    </div>
  )
}
