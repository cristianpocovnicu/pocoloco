'use client'
import StoryTextarea from '@/components/ui/StoryTextarea'

type Props = {
  value: string
  onChange: (value: string) => void
  label: string
  /** rândul mic de sub etichetă, când e ceva de lămurit */
  hint?: string
  placeholder: string
  /** de la câte rânduri pornește, înainte să crească singură */
  minRows?: number
}

/**
 * Povestea întregii ieșiri.
 *
 * Toată mecanica — creșterea automată, contorul, emoji, modul concentrat —
 * stă în StoryTextarea, aceeași componentă ca la povestea unui loc și ca
 * la editarea de după publicare. Aici rămâne doar eticheta.
 */
export default function StoryField({ value, onChange, label, hint, placeholder, minRows }: Props) {
  return (
    <StoryTextarea
      value={value}
      onChange={onChange}
      label={label}
      hint={hint}
      title={label}
      placeholder={placeholder}
      minRows={minRows}
    />
  )
}
