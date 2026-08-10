'use client'
import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import CharCounter from '@/components/ui/CharCounter'
import EmojiButton from '@/components/ui/EmojiButton'
import FocusComposer from '@/components/ui/FocusComposer'

/** Cât de înalt pornește câmpul. Douăsprezece rânduri sunt un ecran de scris. */
const DEFAULT_ROWS = 12

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** titlul din modul concentrat — acolo nu mai e nimic altceva pe ecran */
  title: string
  label?: string
  max?: number
  minRows?: number
  /** fundalul câmpului: alb pe fundal colorat, gri pe card alb */
  tone?: 'white' | 'muted'
}

/**
 * Câmpul de scris al poveștilor — unul singur, pentru toate cele trei
 * locuri unde se scrie: povestea ieșirii, povestea unui loc, editarea de
 * după publicare.
 *
 * Pornește înalt și crește odată cu textul. În colț are două ieșiri:
 * emoji și modul concentrat. Modul concentrat nu copiază textul, îl
 * împrumută — același `value`, același `onChange`, deci autosalvarea nici
 * nu observă că s-a schimbat ecranul.
 */
export default function StoryTextarea({
  value, onChange, placeholder, title, label,
  max = 20000, minRows = DEFAULT_ROWS, tone = 'white',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [caret, setCaret] = useState<number | null>(null)

  // și la montare, nu doar la tastare: un draft reluat vine cu text gata scris
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, focusMode])

  const openFocus = () => {
    setCaret(ref.current?.selectionStart ?? null)
    setFocusMode(true)
  }

  /** La întoarcere, cursorul se așază unde l-ai lăsat în ecranul mare. */
  const closeFocus = (at: number | null) => {
    setFocusMode(false)
    setCaret(at)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      const position = at ?? el.value.length
      el.setSelectionRange(position, position)
    })
  }

  return (
    <div>
      {label && (
        <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">{label}</label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value.slice(0, max))}
          rows={minRows}
          placeholder={placeholder}
          // dreapta lăsată liberă pentru cele două butoane din colț
          className={`w-full border border-[rgba(0,0,0,0.08)] rounded-xl pl-4 pr-[76px] py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed overflow-hidden ${
            tone === 'muted' ? 'bg-[#F8F7F5] focus:bg-white' : 'bg-white'
          }`}
        />

        <div className="absolute right-2 top-2 flex items-center gap-1">
          <EmojiButton value={value} onChange={onChange} target={ref} max={max} />
          <button
            type="button"
            onClick={openFocus}
            aria-label="Scrie fără distrageri"
            title="Scrie fără distrageri"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9B9B9B] hover:bg-[#F8F7F5] transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <CharCounter value={value} max={max} />

      {focusMode && (
        <FocusComposer
          value={value}
          onChange={onChange}
          max={max}
          title={title}
          placeholder={placeholder}
          caret={caret}
          onClose={closeFocus}
        />
      )}
    </div>
  )
}
