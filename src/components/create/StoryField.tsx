'use client'
import { useEffect, useRef } from 'react'
import CharCounter from '@/components/ui/CharCounter'

type Props = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  /** de la câte rânduri pornește, înainte să crească singură */
  minRows?: number
}

/**
 * Povestea întregii ieșiri.
 *
 * Crește odată cu textul, dar pornește de la o înălțime rezonabilă: la un
 * text lung, o textarea fixă ar împinge lista de locuri departe sub linia
 * de plutire, iar una care crește nelimitat de la început ar face același
 * lucru cu spațiul gol.
 */
export default function StoryField({ value, onChange, label, placeholder, minRows = 6 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // și la montare, nu doar la tastare: un draft reluat vine cu text gata scris
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div>
      <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">{label}</label>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value.slice(0, 20000))}
        rows={minRows}
        placeholder={placeholder}
        className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed overflow-hidden"
      />
      <CharCounter value={value} max={20000} />
    </div>
  )
}
