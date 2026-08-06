'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import CoverImage from '@/components/ui/CoverImage'

type Props = {
  images: string[]
  /** câte se văd în grid înainte de „vezi toate" */
  previewCount?: number
}

export default function PhotoGallery({ images, previewCount = 6 }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  // navigare cu tastatura în lightbox + blocarea scroll-ului din spate
  useEffect(() => {
    if (openIndex === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
      if (e.key === 'ArrowRight') setOpenIndex(i => (i === null ? null : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setOpenIndex(i => (i === null ? null : (i - 1 + images.length) % images.length))
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [openIndex, images.length])

  if (images.length === 0) return null

  const shown = showAll ? images : images.slice(0, previewCount)
  const hidden = images.length - shown.length

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {shown.map((src, i) => (
          <button
            key={`${src}-${i}`}
            onClick={() => setOpenIndex(i)}
            className="aspect-square rounded-xl overflow-hidden bg-[#F8F7F5] relative group"
            aria-label={`Deschide fotografia ${i + 1}`}
          >
            <CoverImage src={src} sizes="(max-width: 768px) 33vw, 220px" className="object-cover group-hover:opacity-90 transition-opacity" />
            {!showAll && hidden > 0 && i === shown.length - 1 && (
              <span className="absolute inset-0 bg-black/55 text-white font-outfit text-[15px] font-bold flex items-center justify-center">
                +{hidden}
              </span>
            )}
          </button>
        ))}
      </div>

      {hidden > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-2.5 bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[13px] font-medium rounded-full py-2.5 hover:bg-[#F8F7F5] transition-colors"
        >
          Vezi toate cele {images.length} fotografii
        </button>
      )}

      {/* Lightbox */}
      {openIndex !== null && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" role="dialog" aria-modal="true">
          <button
            onClick={() => setOpenIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center z-10"
            aria-label="Închide"
          >
            <X size={20} className="text-white" />
          </button>

          <span className="absolute top-6 left-1/2 -translate-x-1/2 text-white/70 text-[13px]">
            {openIndex + 1} / {images.length}
          </span>

          {images.length > 1 && (
            <>
              <button
                onClick={() => setOpenIndex((openIndex - 1 + images.length) % images.length)}
                className="absolute left-3 md:left-6 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
                aria-label="Fotografia anterioară"
              >
                <ChevronLeft size={22} className="text-white" />
              </button>
              <button
                onClick={() => setOpenIndex((openIndex + 1) % images.length)}
                className="absolute right-3 md:right-6 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
                aria-label="Fotografia următoare"
              >
                <ChevronRight size={22} className="text-white" />
              </button>
            </>
          )}

          {/* click în afara imaginii închide */}
          <div className="absolute inset-0" onClick={() => setOpenIndex(null)} />
          <img
            src={images[openIndex]}
            alt=""
            className="relative max-h-[85vh] max-w-[92vw] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  )
}
