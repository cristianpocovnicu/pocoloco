'use client'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { Loader2, Smile } from 'lucide-react'
import { insertAtCursor } from '@/lib/insert-at-cursor'

/**
 * Biblioteca vine abia la prima apăsare: panoul nu se randează până nu se
 * deschide, deci nici importul nu pornește.
 */
const EmojiPickerPanel = dynamic(() => import('./EmojiPickerPanel'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center">
      <Loader2 size={16} className="animate-spin text-[#9B9B9B]" />
    </div>
  ),
})

const PANEL_WIDTH = 292
const PANEL_HEIGHT = 312
const MARGIN = 8

type Field = HTMLTextAreaElement | HTMLInputElement

type Props = {
  value: string
  onChange: (value: string) => void
  /** câmpul în care se inserează — de acolo se citește poziția cursorului */
  target: RefObject<Field>
  max: number
}

/**
 * Butonul 😊 de lângă un câmp de text.
 *
 * Pe desktop e singura cale simplă spre emoji; pe mobil tastatura nativă
 * are deja unul, de asta butonul rămâne discret și acolo — pentru cine nu
 * știe de el — fără să concureze cu tastatura.
 *
 * Inserarea se face la cursor, nu la coadă: dacă ai pus cursorul la
 * mijlocul unei fraze, acolo ajunge.
 *
 * Panoul se randează într-un portal, nu lângă buton. Cardul unei
 * experiențe are `overflow-hidden`, iar modalul de editare e o zonă cu
 * scroll — în amândouă, un panou poziționat absolut ar fi retezat.
 */
export default function EmojiButton({ value, onChange, target, max }: Props) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  /** Sub buton dacă încape, deasupra dacă nu; niciodată în afara ecranului. */
  const place = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return

    const below = rect.bottom + 6
    const fitsBelow = below + PANEL_HEIGHT <= window.innerHeight - MARGIN
    const top = fitsBelow
      ? below
      : Math.max(MARGIN, rect.top - 6 - PANEL_HEIGHT)

    const left = Math.min(
      Math.max(MARGIN, rect.right - PANEL_WIDTH),
      window.innerWidth - PANEL_WIDTH - MARGIN
    )

    setBox({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    place()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Oprim Escape aici, altfel ar închide și modul concentrat de dedesubt.
      // Ascultăm în faza de captură tocmai ca să ajungem primii: ecranul de
      // scriere s-a abonat înaintea noastră, deci în bubble ar fi câștigat el.
      e.preventDefault()
      setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      const node = e.target as Node
      if (trigger.current?.contains(node) || panel.current?.contains(node)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mousedown', onDown)
    // orice zonă cu scroll din traseu mișcă butonul, deci și panoul
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  const pick = (emoji: string) => {
    const field = target.current
    const selection = field
      ? { start: field.selectionStart ?? value.length, end: field.selectionEnd ?? value.length }
      : null

    const next = insertAtCursor(value, selection, emoji, max)
    onChange(next.value)
    setOpen(false)

    // după ce React a scris valoarea nouă: altfel cursorul sare la coadă
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(next.caret, next.caret)
    })
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Adaugă un emoji"
        aria-expanded={open}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
          open ? 'bg-[#F0EDE8] text-[#6B6B6B]' : 'text-[#9B9B9B] hover:bg-[#F8F7F5]'
        }`}
      >
        <Smile size={15} />
      </button>

      {open && box && createPortal(
        <div
          ref={panel}
          className="fixed z-[100] bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-lg overflow-hidden"
          style={{ top: box.top, left: box.left, width: PANEL_WIDTH }}
        >
          <EmojiPickerPanel onPick={pick} />
        </div>,
        document.body
      )}
    </>
  )
}
