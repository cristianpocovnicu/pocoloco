'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { PenLine, X } from 'lucide-react'

type Props = {
  locationId: string
  locationName: string
  onClose: () => void
}

/**
 * Apare imediat după ce userul bifează „Am fost". E momentul în care are
 * amintirea proaspătă — de aici vine cea mai mare parte din conținutul nou.
 */
export default function VisitPrompt({ locationId, locationName, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full md:max-w-[420px] rounded-t-3xl md:rounded-2xl p-6 text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center"
          aria-label="Închide"
        >
          <X size={16} className="text-[#6B6B6B]" />
        </button>

        <div className="text-4xl mb-3">🎉</div>
        <h2 className="font-outfit text-[18px] font-bold text-[#0F0F0F] mb-2">
          Super că ai vizitat {locationName}!
        </h2>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
          Povestește-ne cum a fost. Câteva rânduri și o poză ajută pe cine se gândește
          să meargă acolo — și îți umple jurnalul.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href={`/add-experience?location=${locationId}&name=${encodeURIComponent(locationName)}`}
            className="w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-3.5 rounded-full flex items-center justify-center gap-2"
          >
            <PenLine size={16} /> Scrie experiența
          </Link>
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
