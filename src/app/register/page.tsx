'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(true)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)]">
        <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </Link>
        <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Cont nou</span>
      </div>

      <div className="flex-1 px-6 pt-7 pb-10">
        <h1 className="font-outfit text-[26px] font-bold text-[#0F0F0F] mb-1.5">Hai să explorăm 🌍</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Creează-ți contul și începe să adaugi experiențele tale de călătorie.</p>

        <div className="flex flex-col gap-2.5 mb-5">
          {[
            { icon: 'G', bg: '#fff', border: '#ddd', label: 'Continuă cu Google' },
            { icon: '🍎', bg: '#000', border: '#000', label: 'Continuă cu Apple', white: true },
          ].map(s => (
            <button key={s.label} className="w-full py-3.5 rounded-full border flex items-center justify-center gap-2.5 font-outfit text-[14px] font-medium" style={{ borderColor: s.border, background: s.bg, color: s.white ? '#fff' : '#0F0F0F' }}>
              <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
          <span className="text-[12px] text-[#9B9B9B]">sau cu email</span>
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Nume complet</label>
            <input type="text" placeholder="Ex: Maria Popescu" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Email</label>
            <input type="email" placeholder="tu@exemplu.com" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Parolă</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} placeholder="Minim 8 caractere" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff size={16} className="text-[#9B9B9B]" /> : <Eye size={16} className="text-[#9B9B9B]" />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => setAgreed(!agreed)} className="w-full flex items-start gap-3 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-3 mb-5 text-left">
          <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${agreed ? 'bg-[#E8440A]' : 'bg-white border border-[rgba(0,0,0,0.15)]'}`}>
            {agreed && <Check size={12} className="text-white" />}
          </div>
          <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
            Accept <span className="text-[#E8440A] font-medium">Termenii și condițiile</span> și <span className="text-[#E8440A] font-medium">Politica de confidențialitate</span> Pocoloco.
          </p>
        </button>

        <Link href="/onboarding" className="block w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full text-center mb-4">
          Creează cont gratuit
        </Link>
        <p className="text-[13px] text-[#6B6B6B] text-center">
          Ai deja cont?{' '}
          <Link href="/login" className="text-[#E8440A] font-semibold">Intră în cont</Link>
        </p>
      </div>
    </div>
  )
}
