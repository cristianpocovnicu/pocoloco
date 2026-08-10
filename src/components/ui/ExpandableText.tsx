'use client'
import { useRef, useState, type ReactNode, type RefObject } from 'react'

/**
 * Clasele de trunchiere, scrise întregi.
 *
 * Tailwind citește codul ca text, nu îl execută: un `line-clamp-${n}`
 * construit din bucăți n-ar ajunge niciodată în CSS-ul final.
 */
const CLAMP: Record<number, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  7: 'line-clamp-[7]',
}

type Props = {
  text: string
  /** sub atâtea caractere textul apare întreg, fără niciun buton */
  threshold: number
  /** câte rânduri se văd cât e strâns */
  lines: 2 | 3 | 7
  className?: string
  /** stilul butonului: pe carduri mari e 12px, în itinerar 11px */
  actionClassName?: string
  /** apare lângă „Restrânge", doar cât textul e desfăcut */
  footer?: ReactNode
  /**
   * Unde se întoarce pagina la restrângere. Implicit e chiar textul; pe
   * un card întreg se dă cardul, ca să nu rămâi la mijlocul lui.
   */
  scrollTo?: RefObject<HTMLElement>
}

/**
 * Un text lung, cu preview și desfacere pe loc.
 *
 * Textul e **întreg în DOM de la început** și tăiat doar din CSS: „Citește
 * tot" comută o clasă, nu aduce nimic de pe server. Așa lectura se face
 * unde ești, fără drum dus-întors, iar ce e de citit rămâne în pagină și
 * pentru crawlere.
 *
 * A trăit întâi în ExperienceCard, pe pagina locului. A doua oară a fost
 * nevoie de el în itinerarul unei călătorii — momentul potrivit să iasă
 * într-o componentă, înainte de a treia copie.
 */
export default function ExpandableText({
  text, threshold, lines, className = '', actionClassName = '', footer, scrollTo,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const own = useRef<HTMLDivElement>(null)

  const body = text.trim()
  // sub prag n-are ce fi desfăcut: butonul nici nu apare
  const long = body.length > threshold

  /**
   * La restrângere, un text lung dispare de sub degete și rămâi în mijlocul
   * paginii, fără reper. Dacă începutul a ieșit din ecran, îl aducem înapoi.
   */
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) return

    const target = scrollTo?.current || own.current
    if (target && target.getBoundingClientRect().top < 0) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div ref={own}>
      <p className={`whitespace-pre-line ${className} ${long && !expanded ? CLAMP[lines] : ''}`}>
        {body}
      </p>

      {long && (
        <button
          type="button"
          onClick={toggle}
          className={`font-medium mt-1 inline-block ${actionClassName}`}
        >
          {expanded ? 'Restrânge' : 'Citește tot'}
        </button>
      )}

      {expanded && footer}
    </div>
  )
}
