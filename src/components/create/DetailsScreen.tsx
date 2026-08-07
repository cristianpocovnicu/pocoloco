'use client'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import OutingCard from './OutingCard'
import { stopLabel, stopSubtitle, type StopDraft, type TripDraft } from '@/lib/story'

type Props = {
  trip: TripDraft
  stops: StopDraft[]
  onTripChange: (patch: Partial<TripDraft>) => void
  onStopChange: (key: string, patch: Partial<StopDraft>) => void
  onMove: (index: number, direction: -1 | 1) => void
  onBack: () => void
  onPublish: () => void
  publishing: boolean
  /** zile care s-au golit singure când a scăzut durata */
  clearedDays: number
}

/**
 * Pasul al doilea: ce ține de călătorie ca întreg.
 *
 * A stat o vreme ca un card pe ecranul de povestit, dar acolo aglomera
 * exact când erau mai multe locuri de citit, iar ziua fiecărui loc n-avea
 * unde să fie cerută: ca s-o alegi ai nevoie să vezi durata și lista
 * locurilor în același loc. Aici le vezi.
 */
export default function DetailsScreen({
  trip,
  stops,
  onTripChange,
  onStopChange,
  onMove,
  onBack,
  onPublish,
  publishing,
  clearedDays,
}: Props) {
  const days = Array.from({ length: Math.max(trip.durationDays, 1) }, (_, i) => i + 1)
  const canPublish = trip.title.trim().length > 0

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto">
          <div className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Detaliile călătoriei</div>
          <div className="text-[11px] text-[#9B9B9B]">
            {stops.length} locuri povestite — mai lipsește doar cum se numește.
          </div>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 pt-4 pb-40 flex flex-col gap-4">
        <OutingCard trip={trip} stops={stops} onChange={onTripChange} />

        {/* Locurile, în ordinea povestirii */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-0.5">Locurile</p>
          <p className="text-[12px] text-[#9B9B9B] mb-3">
            Poți spune în ce zi ai fost la fiecare. Dacă sari peste, rămân toate la un loc.
          </p>

          {clearedDays > 0 && (
            <div className="bg-[#FFFBEB] border border-[rgba(217,119,6,0.2)] rounded-xl px-3 py-2 mb-3">
              <p className="text-[12px] text-[#6B6B6B]">
                {clearedDays === 1
                  ? 'Un loc rămăsese pe o zi care nu mai există — l-am lăsat fără zi.'
                  : `${clearedDays} locuri rămăseseră pe zile care nu mai există — le-am lăsat fără zi.`}
              </p>
            </div>
          )}

          <div className="flex flex-col">
            {stops.map((stop, index) => (
              <div
                key={stop.key}
                className="flex items-center gap-2.5 py-2.5 border-t border-[rgba(0,0,0,0.06)] first:border-t-0"
              >
                <div className="flex flex-col flex-shrink-0">
                  <button type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mută ${stopLabel(stop)} mai sus`}
                    className="w-6 h-5 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F] disabled:opacity-25"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === stops.length - 1}
                    aria-label={`Mută ${stopLabel(stop)} mai jos`}
                    className="w-6 h-5 flex items-center justify-center text-[#9B9B9B] hover:text-[#0F0F0F] disabled:opacity-25"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="w-9 h-9 rounded-xl bg-[#F8F7F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {stop.images[0]
                    ? <img src={stop.images[0]} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm">{stop.kind === 'activity' ? '🪂' : '📍'}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#0F0F0F] truncate">{stopLabel(stop)}</p>
                  {stopSubtitle(stop) && (
                    <p className="text-[11px] text-[#9B9B9B] truncate">{stopSubtitle(stop)}</p>
                  )}
                </div>

                <select
                  value={stop.day ?? ''}
                  onChange={e => onStopChange(stop.key, {
                    day: e.target.value ? Number(e.target.value) : null,
                  })}
                  aria-label={`Ziua pentru ${stopLabel(stop)}`}
                  className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1.5 text-[12px] text-[#0F0F0F] outline-none focus:border-[#E8440A] transition-colors flex-shrink-0"
                >
                  <option value="">fără zi</option>
                  {days.map(day => (
                    <option key={day} value={day}>Ziua {day}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] px-5 pt-3 z-40"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <button type="button"
            onClick={onPublish}
            disabled={!canPublish || publishing}
            className={`flex-1 font-outfit text-[15px] font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition-colors ${
              canPublish && !publishing ? 'bg-[#E8440A] text-white' : 'bg-[#F1F1F1] text-[#9B9B9B]'
            }`}
          >
            {publishing && <Loader2 size={16} className="animate-spin" />}
            Publică
          </button>
          <button type="button"
            onClick={onBack}
            disabled={publishing}
            className="text-[13px] text-[#6B6B6B] font-medium px-2 disabled:opacity-50"
          >
            Înapoi la poveste
          </button>
        </div>

        {!canPublish && (
          <p className="max-w-[680px] mx-auto text-[11px] text-[#9B9B9B] mt-1.5">
            Mai lipsește numele călătoriei.
          </p>
        )}
      </div>
    </div>
  )
}
