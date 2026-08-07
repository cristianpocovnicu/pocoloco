'use client'
import { Camera, ChevronDown, ChevronUp, MessageSquare, Star, Trash2 } from 'lucide-react'
import SubjectPicker from './SubjectPicker'
import { PhotoEditor, RatingEditor, Section, StoryEditor } from './StopSections'
import { stopHasSubject, stopLabel, stopSubtitle, type StopDraft } from '@/lib/story'

type Props = {
  stop: StopDraft
  index: number
  total: number
  expanded: boolean
  onExpand: () => void
  onChange: (patch: Partial<StopDraft>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  /** ce secțiuni sunt deschise acum, ținut în afara draftului */
  open: { photos: boolean; ratings: boolean; story: boolean }
  onToggleSection: (section: 'photos' | 'ratings' | 'story') => void
}

/**
 * O oprire. Prima e deschisă din start; restul se deschid pe rând, ca să
 * nu ai niciodată în față mai mult decât un lucru de completat.
 */
export default function StopCard({
  stop,
  index,
  total,
  expanded,
  onExpand,
  onChange,
  onRemove,
  onMove,
  open,
  onToggleSection,
}: Props) {
  // la primul loc totul e deschis de la început; la următoarele, doar
  // căutarea și nota, restul la cerere
  const alwaysOpen = index === 0

  const photoSummary = stop.images.length > 0
    ? `${stop.images.length} ${stop.images.length === 1 ? 'poză' : 'poze'}`
    : null

  const ratingSummary = stop.ratingExperience > 0
    ? '★'.repeat(stop.ratingExperience) + '☆'.repeat(5 - stop.ratingExperience)
    : null

  const storySummary = stop.content.trim()
    ? `${stop.content.trim().slice(0, 60)}${stop.content.trim().length > 60 ? '…' : ''}`
    : stop.tips.length > 0 ? `${stop.tips.length} ponturi` : null

  // ---- strâns ----
  if (!expanded) return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-3.5 py-3 flex items-center gap-3">
      <button onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
          {stop.images[0]
            ? <img src={stop.images[0]} alt="" className="w-full h-full object-cover" />
            : <span className="text-base">{stop.kind === 'activity' ? '🪂' : '📍'}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
            {stopHasSubject(stop) ? stopLabel(stop) : 'Oprire fără nume'}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#9B9B9B]">
            {stopSubtitle(stop) && <span className="truncate">{stopSubtitle(stop)}</span>}
            <span className="flex items-center gap-1.5 flex-shrink-0">
              {stop.images.length > 0 && <Camera size={11} />}
              {stop.ratingExperience > 0 && <Star size={11} />}
              {(stop.content.trim() || stop.note.trim()) && <MessageSquare size={11} />}
            </span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {index > 0 && (
          <button onClick={() => onMove(-1)} aria-label="Mută mai sus" className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F]">
            <ChevronUp size={15} />
          </button>
        )}
        {index < total - 1 && (
          <button onClick={() => onMove(1)} aria-label="Mută mai jos" className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F]">
            <ChevronDown size={15} />
          </button>
        )}
        <button onClick={onRemove} aria-label="Șterge oprirea" className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#DC2626]">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  // ---- deschis ----
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.12)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide">
          {index === 0 ? 'Prima oprire' : `Oprirea ${index + 1}`}
        </span>
        {total > 1 && (
          <button onClick={onRemove} aria-label="Șterge oprirea" className="text-[#9B9B9B] hover:text-[#DC2626]">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <SubjectPicker stop={stop} onChange={onChange} autoFocus={index === 0 && !stopHasSubject(stop)} />

      {stopHasSubject(stop) && (
        <div className="mt-3">
          {/* opririle de după prima cer cel mult o notă */}
          {index > 0 && (
            <input
              value={stop.note}
              onChange={e => onChange({ note: e.target.value.slice(0, 500) })}
              placeholder="Ce ai făcut acolo? (opțional)"
              className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] mb-1"
            />
          )}

          <Section
            label="Poze"
            hint="Ce ai văzut"
            summary={photoSummary}
            open={open.photos}
            onToggle={() => onToggleSection('photos')}
            alwaysOpen={alwaysOpen}
          >
            <PhotoEditor images={stop.images} onChange={images => onChange({ images })} />
          </Section>

          <Section
            label="Cum a fost"
            hint="Câte stele dai"
            summary={ratingSummary}
            open={open.ratings}
            onToggle={() => onToggleSection('ratings')}
            alwaysOpen={alwaysOpen}
          >
            <RatingEditor stop={stop} onChange={onChange} />
          </Section>

          <Section
            label="Povestea și ponturile"
            hint="Ce ar fi bine să știe altcineva"
            summary={storySummary}
            open={open.story}
            onToggle={() => onToggleSection('story')}
            alwaysOpen={alwaysOpen}
          >
            <StoryEditor stop={stop} onChange={onChange} />
          </Section>
        </div>
      )}
    </div>
  )
}
