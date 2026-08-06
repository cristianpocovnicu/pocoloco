'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { MapPin, PenLine, X } from 'lucide-react'

export type StopWithoutReview = {
  id: string
  name: string
  city: string | null
}

type Props = {
  stops: StopWithoutReview[]
  onClose: () => void
}

/**
 * După publicarea călătoriei: opririle despre care autorul n-a scris încă.
 * Aici e momentul cu cel mai mare randament — are traseul proaspăt în cap
 * și tocmai a terminat de povestit despre el.
 */
export default function TellUsMorePrompt({ stops, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full md:max-w-[440px] rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white px-6 pt-6 pb-3">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center"
            aria-label="Închide"
          >
            <X size={16} className="text-[#6B6B6B]" />
          </button>

          <div className="text-4xl mb-3">🎉</div>
          <h2 className="font-outfit text-[18px] font-bold text-[#0F0F0F] mb-2">
            Călătoria e publicată!
          </h2>
          <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
            Vrei să povestești în detaliu despre vreo oprire? O recenzie scurtă
            ajută pe cine ajunge acolo — și se leagă automat de călătorie.
          </p>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-2">
          {stops.map(stop => (
            <Link
              key={stop.id}
              href={`/add-experience?location=${stop.id}&name=${encodeURIComponent(stop.name)}`}
              className="border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-3 flex items-center gap-2.5 hover:border-[rgba(232,68,10,0.35)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-[#E8440A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0F0F0F] truncate">{stop.name}</p>
                <p className="text-[11px] text-[#9B9B9B] truncate">{stop.city || 'Fără oraș'}</p>
              </div>
              <PenLine size={14} className="text-[#5B4FCF] flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white px-6 pt-3 pb-6">
          <button
            onClick={onClose}
            className="w-full text-[#6B6B6B] font-outfit text-[14px] font-medium py-2.5"
          >
            Poate mai târziu
          </button>
        </div>
      </div>
    </div>
  )
}
