'use client'
import { PenLine, Trash2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { MAX_DRAFTS, stopLabel, type DraftRow } from '@/lib/story'

/**
 * Poveștile neterminate, la intrarea în flux.
 *
 * Cât timp erau limitate la una, un banner cu „Continuă / Începe altceva"
 * ajungea — iar „altceva" însemna suprascriere, cu confirmare. Cu trei
 * sloturi, alegerea trebuie să fie explicită: care dintre ele, și ce se
 * sacrifică atunci când sunt toate pline.
 *
 * Nimic nu se suprascrie tăcut. La limită, drumul spre o poveste nouă
 * trece prin ștergerea uneia — decisă de om, nu de cod.
 */
export default function DraftPicker({
  drafts,
  onResume,
  onDelete,
  onNew,
}: {
  drafts: DraftRow[]
  onResume: (row: DraftRow) => void
  onDelete: (row: DraftRow) => void
  onNew: () => void
}) {
  const full = drafts.length >= MAX_DRAFTS

  return (
    <div className="bg-white border border-[rgba(232,68,10,0.25)] rounded-2xl p-4 mb-4">
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">
          {drafts.length === 1
            ? 'Ai o poveste neterminată'
            : `Ai ${drafts.length} povești neterminate`}
        </p>
        <span className="text-[12px] text-[#9B9B9B] flex-shrink-0">
          {drafts.length} din {MAX_DRAFTS}
        </span>
      </div>

      <p className="text-[13px] text-[#6B6B6B] mb-3">
        {full
          ? 'Ai atins limita. Termină una sau șterge una ca să începi alta.'
          : 'Continuă una dintre ele sau începe alta.'}
      </p>

      <div className="flex flex-col gap-2 mb-3">
        {drafts.map(row => {
          const title = row.draft.trip.title.trim() || stopLabel(row.draft.stops[0])
          const rest = row.draft.stops.length - 1

          return (
            <div
              key={row.id}
              className="border border-[rgba(0,0,0,0.08)] rounded-xl px-3 py-2.5 flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => onResume(row)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
                  <PenLine size={14} className="text-[#E8440A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#0F0F0F] truncate">
                    {title || 'Fără titlu'}
                  </p>
                  <p className="text-[11px] text-[#9B9B9B] truncate">
                    {row.draft.stops.length} {row.draft.stops.length === 1 ? 'loc' : 'locuri'}
                    {rest >= 0 && ' · '}
                    {timeAgo(row.updatedAt)}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onResume(row)}
                className="text-[12px] text-[#E8440A] font-outfit font-semibold flex-shrink-0"
              >
                Continuă
              </button>
              <button
                type="button"
                onClick={() => onDelete(row)}
                aria-label={`Șterge „${title}"`}
                className="text-[#9B9B9B] hover:text-[#DC2626] flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      {!full && (
        <button
          type="button"
          onClick={onNew}
          className="text-[13px] text-[#5B4FCF] font-outfit font-semibold"
        >
          + Începe o poveste nouă
        </button>
      )}
    </div>
  )
}
