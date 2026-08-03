'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { TRAVEL_STYLES } from '@/lib/utils'

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string[]>(['adventure'])

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex flex-col">
      <div className="bg-white px-5 pt-4 pb-3 flex items-center justify-between border-b border-[rgba(0,0,0,0.08)]">
        <span className="text-[12px] text-[#9B9B9B] font-outfit">Pasul 1 din 3</span>
        <Link href="/" className="text-[13px] text-[#E8440A] font-medium">Sari peste</Link>
      </div>
      <div className="h-1 bg-[rgba(0,0,0,0.08)]">
        <div className="h-full bg-[#E8440A] transition-all" style={{ width: '33%' }} />
      </div>

      <div className="flex-1 px-6 pt-7 pb-10">
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="font-outfit text-[24px] font-bold text-[#0F0F0F] mb-2">Ce fel de călător ești?</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Îți personalizăm feed-ul în funcție de stilul tău de a călători.</p>

        <div className="flex flex-col gap-2.5 mb-7">
          {TRAVEL_STYLES.map(style => {
            const on = selected.includes(style.id)
            return (
              <button
                key={style.id}
                onClick={() => toggle(style.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${on ? 'bg-[#FFF0EB] border-[rgba(232,68,10,0.25)]' : 'bg-white border-[rgba(0,0,0,0.08)]'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${on ? 'bg-[#FFF0EB]' : 'bg-[#F8F7F5]'}`}>{style.emoji}</div>
                <div className="flex-1">
                  <div className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">{style.label}</div>
                  <div className="text-[12px] text-[#9B9B9B]">{style.sub}</div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-[#E8440A]' : 'bg-white border border-[rgba(0,0,0,0.15)]'}`}>
                  {on && <Check size={11} className="text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        <Link href="/" className="block w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full text-center">
          Continuă
        </Link>
      </div>
    </div>
  )
}
