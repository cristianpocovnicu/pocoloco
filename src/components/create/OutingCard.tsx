'use client'
import { Minus, Plus } from 'lucide-react'
import { TRANSPORT_TYPES } from '@/lib/utils'
import { suggestTripTitle, type StopDraft, type TripDraft } from '@/lib/story'

type Props = {
  trip: TripDraft
  stops: StopDraft[]
  onChange: (patch: Partial<TripDraft>) => void
}

/**
 * Nume, durată, transport, copertă — câmpurile pasului de finalizare.
 *
 * Aici se ajunge doar cu două locuri deja povestite, deci cuvântul
 * „călătorie" are voie să apară: numește rezultatul, nu îl anunță.
 */
export default function OutingCard({ trip, stops, onChange }: Props) {
  const photos = stops.flatMap(stop => stop.images)
  const suggestion = suggestTripTitle(stops)

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
      <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Cum o numim?</label>
      <input
        value={trip.title}
        onChange={e => onChange({ title: e.target.value.slice(0, 120) })}
        placeholder={suggestion ? `Ex: ${suggestion}` : 'Ex: Weekend în munți'}
        className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] mb-1"
      />
      {!trip.title.trim() && suggestion && (
        <button
          onClick={() => onChange({ title: suggestion })}
          className="text-[12px] text-[#5B4FCF] font-medium mb-3"
        >
          Folosește „{suggestion}&rdquo;
        </button>
      )}

      <div className="flex items-center justify-between py-3 border-t border-[rgba(0,0,0,0.06)] mt-3">
        <span className="text-[13px] text-[#6B6B6B]">Câte zile a ținut</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange({ durationDays: Math.max(trip.durationDays - 1, 1) })}
            aria-label="Mai puține zile"
            className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center"
          >
            <Minus size={14} className="text-[#6B6B6B]" />
          </button>
          <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] w-6 text-center">
            {trip.durationDays}
          </span>
          <button
            onClick={() => onChange({ durationDays: Math.min(trip.durationDays + 1, 60) })}
            aria-label="Mai multe zile"
            className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center"
          >
            <Plus size={14} className="text-[#6B6B6B]" />
          </button>
        </div>
      </div>

      <div className="py-3 border-t border-[rgba(0,0,0,0.06)]">
        <span className="text-[13px] text-[#6B6B6B] block mb-2">Cum ai ajuns</span>
        <div className="flex flex-wrap gap-1.5">
          {TRANSPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => onChange({ transportType: type.id })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                trip.transportType === type.id
                  ? 'bg-[#FFF0EB] text-[#E8440A] border-[rgba(232,68,10,0.25)]'
                  : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
              }`}
            >
              {type.emoji} {type.label}
            </button>
          ))}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="py-3 border-t border-[rgba(0,0,0,0.06)]">
          <span className="text-[13px] text-[#6B6B6B] block mb-2">
            Poza de deasupra <span className="text-[#9B9B9B]">— implicit prima</span>
          </span>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map(url => {
              const chosen = (trip.coverImage || photos[0]) === url
              return (
                <button
                  key={url}
                  onClick={() => onChange({ coverImage: url })}
                  className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    chosen ? 'border-[#E8440A]' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
