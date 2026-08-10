'use client'
import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import CharCounter from '@/components/ui/CharCounter'
import { useAutosize } from '@/components/ui/useAutosize'
import EmojiButton from '@/components/ui/EmojiButton'

/** Sub atâția pixeli lipsă din fereastră, diferența nu e o tastatură. */
const KEYBOARD_THRESHOLD = 120

type Box = { height: number | null; offsetTop: number; keyboard: boolean }

function measure(): Box {
  if (typeof window === 'undefined') return { height: null, offsetTop: 0, keyboard: false }
  const viewport = window.visualViewport
  const height = viewport?.height ?? window.innerHeight
  return {
    height,
    offsetTop: viewport?.offsetTop ?? 0,
    keyboard: window.innerHeight - height > KEYBOARD_THRESHOLD,
  }
}

/**
 * Cât ecran a mai rămas, după ce tastatura și-a luat partea.
 *
 * `100vh` minte pe mobil: rămâne înălțimea ferestrei chiar și cu tastatura
 * pe ecran, așa că footerul cu contorul ar sta dedesubtul ei. `visualViewport`
 * spune adevărul, iar `offsetTop` compensează momentele în care browserul
 * (iOS mai ales) împinge singur pagina în sus ca să vadă câmpul focalizat —
 * fără el, un `position: fixed` iese din ecran.
 */
function useViewportBox(): Box {
  const [box, setBox] = useState<Box>(measure)

  useEffect(() => {
    const read = () => setBox(measure())
    const viewport = window.visualViewport

    read()
    viewport?.addEventListener('resize', read)
    viewport?.addEventListener('scroll', read)
    window.addEventListener('resize', read)

    return () => {
      viewport?.removeEventListener('resize', read)
      viewport?.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  return box
}

type Props = {
  value: string
  onChange: (value: string) => void
  max: number
  title: string
  placeholder?: string
  /** unde stătea cursorul în câmpul mic, ca să continue de acolo */
  caret: number | null
  /** primește poziția cursorului la ieșire, ca s-o ducă înapoi */
  onClose: (caret: number | null) => void
}

/**
 * Modul de scriere concentrat.
 *
 * Nu e o copie a textului, ci **același state**: primește `value` și
 * `onChange` de la câmpul mic, deci autosalvarea curge neîntrerupt, iar
 * „Gata" nu salvează nimic — doar închide.
 */
export default function FocusComposer({
  value, onChange, max, title, placeholder, caret, onClose,
}: Props) {
  const box = useViewportBox()
  const ref = useRef<HTMLTextAreaElement>(null)

  // crește odată cu textul; scrollul îl face containerul, nu câmpul
  useAutosize(ref, value)

  // deschis din mijlocul unei fraze: cursorul rămâne unde era
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const at = caret ?? value.length
    el.setSelectionRange(at, at)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => onClose(ref.current?.selectionStart ?? null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape închide, dar nu peste picker-ul de emoji: acela îl oprește primul
      if (e.key === 'Escape' && !e.defaultPrevented) close()
    }
    document.addEventListener('keydown', onKey)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed left-0 top-0 w-full z-[90] bg-white flex flex-col"
      style={{
        height: box.height ?? undefined,
        minHeight: box.height ? undefined : '100vh',
        transform: box.offsetTop ? `translateY(${box.offsetTop}px)` : undefined,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{title}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <EmojiButton value={value} onChange={onChange} target={ref} max={max} />
          <button
            type="button"
            onClick={close}
            className="bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-1.5 rounded-full flex items-center gap-1"
          >
            <Check size={14} /> Gata
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value.slice(0, max))}
          placeholder={placeholder}
          // aceeași măsură și aceeași înălțime de rând ca la citit (.story-text),
          // dar fără `pre-line`: într-o textarea ar înghiți spațiile duble
          // chiar în timp ce omul le scrie
          style={{ '--rows': 6 } as React.CSSProperties}
          className="autosize block w-full max-w-[68ch] mx-auto bg-transparent border-0 outline-none resize-none text-[15px] leading-[1.75] text-[#0F0F0F] placeholder:text-[#9B9B9B] overflow-hidden"
        />
      </div>

      <div
        className="px-5 pt-1 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0"
        style={{
          // cu tastatura pe ecran nu mai există zonă de siguranță jos:
          // e acoperită oricum, iar spațiul ar rămâne gol deasupra ei
          paddingBottom: box.keyboard ? '0.5rem' : 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-[68ch] mx-auto">
          <CharCounter value={value} max={max} />
        </div>
      </div>
    </div>
  )
}
