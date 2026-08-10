'use client'
import { Camera, ChevronDown, ChevronUp, MessageSquare, Star, Trash2 } from 'lucide-react'
import SubjectPicker from './SubjectPicker'
import { PeriodPicker, PhotoEditor, RatingEditor, Section, StoryEditor } from './StopSections'
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
  /** textul din câmpul gol, când cardul cere primul loc dintr-o zonă */
  placeholder?: string
  /**
   * Zilele dintre care se poate alege, calculate din durata de mai sus.
   * Lipsesc când ieșirea are o singură zi: n-ar fi nimic de ales.
   */
  days?: number[]
  /**
   * Perioada se întreabă pe card doar când povestea e despre un singur
   * obiectiv. Pe o ieșire întreagă e o singură dată, în detalii.
   */
  showPeriod?: boolean
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
  placeholder,
  days,
  showPeriod = true,
}: Props) {
  const showDays = !!days && days.length > 1 && stopHasSubject(stop)

  const daySelect = (compact: boolean) => (
    <select
      value={stop.day ?? ''}
      onChange={e => onChange({ day: e.target.value ? Number(e.target.value) : null })}
      onClick={e => e.stopPropagation()}
      aria-label={`Ziua pentru ${stopLabel(stop)}`}
      className={`bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg text-[#0F0F0F] outline-none focus:border-[#E8440A] transition-colors flex-shrink-0 ${
        compact ? 'px-1.5 py-1 text-[11px]' : 'px-2.5 py-1.5 text-[12px]'
      }`}
    >
      <option value="">fără zi</option>
      {(days || []).map(day => (
        <option key={day} value={day}>Ziua {day}</option>
      ))}
    </select>
  )
  // la primul loc totul e deschis de la început; la următoarele, doar
  // căutarea și nota, restul la cerere
  const alwaysOpen = index === 0

  const photoSummary = stop.images.length > 0
    ? `${stop.images.length} ${stop.images.length === 1 ? 'poză' : 'poze'}`
    : null

  const ratingSummary = stop.ratingExperience > 0
    ? '★'.repeat(stop.ratingExperience) + '☆'.repeat(5 - stop.ratingExperience)
    : null

  // aceeași întrebare și pe secțiune, și în capul modului concentrat
  const storyLabel = stopHasSubject(stop)
    ? `Cum a fost la ${stopLabel(stop)}?`
    : 'Povestea și ponturile'

  const storySummary = stop.content.trim()
    ? `${stop.content.trim().slice(0, 60)}${stop.content.trim().length > 60 ? '…' : ''}`
    : stop.tips.length > 0 ? `${stop.tips.length} ponturi` : null

  // ---- strâns ----
  if (!expanded) return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-3.5 py-3 flex items-center gap-3">
      <button type="button" onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
          {stop.images[0]
            ? <img src={stop.images[0]} alt="" className="w-full h-full object-cover" />
            : <span className="text-base">{stop.kind === 'activity' ? '🪂' : '📍'}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
            {stopLabel(stop)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#9B9B9B]">
            {stopSubtitle(stop) && <span className="truncate">{stopSubtitle(stop)}</span>}
            <span className="flex items-center gap-1.5 flex-shrink-0">
              {stop.images.length > 0 && <Camera size={11} />}
              {stop.ratingExperience > 0 && <Star size={11} />}
              {stop.content.trim() && <MessageSquare size={11} />}
            </span>
          </div>

          {/* Când cardul se strânge — la adăugarea locului următor —
              iconița singură nu liniștește pe nimeni că textul mai e
              acolo. Începutul poveștii, da. */}
          {storySummary && (
            <p className="text-[11px] text-[#6B6B6B] truncate mt-0.5">{storySummary}</p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {showDays && daySelect(true)}
        {index > 0 && (
          <button type="button" onClick={() => onMove(-1)} aria-label="Mută mai sus" className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F]">
            <ChevronUp size={15} />
          </button>
        )}
        {index < total - 1 && (
          <button type="button" onClick={() => onMove(1)} aria-label="Mută mai jos" className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F]">
            <ChevronDown size={15} />
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label={`Șterge ${stopLabel(stop)}`} className="w-7 h-7 flex items-center justify-center text-[#9B9B9B] hover:text-[#DC2626]">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  // ---- deschis ----
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.12)] rounded-2xl p-4">
      {/* Cât nu s-a ales nimic, titlul e întrebarea. După alegere, numele
          locului sau al activității ține locul titlului — îl arată chiar
          câmpul, așa că nu-l repetăm deasupra. */}
      {!stopHasSubject(stop) && (
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* „Unde ai fost?" e întrebarea ecranului de intrare; aici, unde
              se adaugă locurile unei destinații deja numite, întrebarea e
              mai fină — altfel ar suna ca și cum n-am ascultat prima dată */}
          <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">
            {index === 0 ? 'Unde anume?' : 'Ce ai mai făcut?'}
          </h2>
          {total > 1 && (
            <button type="button" onClick={onRemove} aria-label="Șterge" className="text-[#9B9B9B] hover:text-[#DC2626] flex-shrink-0">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}

      {stopHasSubject(stop) && total > 1 && (
        <div className="flex justify-end mb-1">
          <button type="button" onClick={onRemove} aria-label={`Șterge ${stopLabel(stop)}`} className="text-[#9B9B9B] hover:text-[#DC2626]">
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Fără autofocus. Primul card îl avea de pe vremea când el era
          intrarea în flux; de la rutare (iterația 7) intrarea are câmpul ei,
          iar aici focusul programatic doar sare ecranul și scoate tastatura
          peste o pagină pe care omul n-a apucat s-o vadă. */}
      <SubjectPicker
        stop={stop}
        onChange={onChange}
        placeholder={placeholder}
      />

      {stopHasSubject(stop) && (
        <div className="mt-3">
          {/* Perioada stă lângă „unde", nu în secțiunea de notare: ține de
              vizită, nu de cât de bun a fost locul. Pe o ieșire întreagă
              se întreabă o singură dată, sus, deci aici rămâne doar ziua. */}
          {(showPeriod || showDays) && (
            <div className="pb-3 border-b border-[rgba(0,0,0,0.06)] mb-1 flex items-center gap-2 flex-wrap">
              {showPeriod && (
                <div className="flex-1 min-w-0">
                  <PeriodPicker
                    year={stop.visitedYear}
                    month={stop.visitedMonth}
                    onChange={onChange}
                  />
                </div>
              )}
              {/* ziua din ieșire stă tot aici: e despre când, nu despre cum a fost */}
              {showDays && daySelect(false)}
            </div>
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
            label="Ce note dai"
            hint="Câte stele merită"
            summary={ratingSummary}
            open={open.ratings}
            onToggle={() => onToggleSection('ratings')}
            alwaysOpen={alwaysOpen}
          >
            <RatingEditor stop={stop} onChange={onChange} />
          </Section>

          <Section
            label={storyLabel}
            hint="Ce ar fi bine să știe altcineva"
            summary={storySummary}
            open={open.story}
            onToggle={() => onToggleSection('story')}
            alwaysOpen={alwaysOpen}
          >
            <StoryEditor stop={stop} onChange={onChange} title={storyLabel} />
          </Section>
        </div>
      )}
    </div>
  )
}
