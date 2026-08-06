'use client'
import { useEffect, useRef, useState } from 'react'
import { Globe, X } from 'lucide-react'
import { searchCountries } from '@/lib/countries'

type Props = {
  value: string[]
  onChange: (countries: string[]) => void
}

/**
 * Alegere de țări dintr-o listă fixă — fără valori libere, ca să nu ajungem
 * cu „Romania", „România" și „ROMANIA" ca țări diferite în filtre.
 * Valorile deja salvate se afișează ca atare, chiar dacă nu sunt în listă.
 */
export default function CountryPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const suggestions = searchCountries(query, value)

  useEffect(() => { setHighlight(0) }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const add = (country: string) => {
    if (!value.includes(country)) onChange([...value, country])
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[highlight]) add(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div>
      <div ref={boxRef} className="relative">
        <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Caută o țară..."
          className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]"
        />

        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-lg z-30 overflow-hidden">
            {suggestions.map((country, i) => (
              <button
                key={country}
                onClick={() => add(country)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-4 py-2.5 text-[13px] border-b border-[rgba(0,0,0,0.05)] last:border-0 ${
                  i === highlight ? 'bg-[#F8F7F5] text-[#0F0F0F]' : 'text-[#6B6B6B]'
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        )}

        {open && query.trim() && suggestions.length === 0 && (
          <p className="text-[11px] text-[#9B9B9B] mt-2">
            Nicio țară găsită. Verifică scrierea — lista e în română.
          </p>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {value.map(country => (
            <span key={country} className="bg-[#EEEDFB] text-[#5B4FCF] text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              {country}
              <button onClick={() => onChange(value.filter(c => c !== country))} aria-label={`Șterge ${country}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
