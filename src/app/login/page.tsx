'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)]">
        <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </Link>
        <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Intră în cont</span>
      </div>

      <div className="flex-1 px-6 pt-7">
        <h1 className="font-outfit text-[26px] font-bold text-[#0F0F0F] mb-1.5">Bine ai revenit 👋</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Intră în cont și continuă să explorezi lumea cu Pocoloco.</p>

        <div className="flex flex-col gap-2.5 mb-5">
          {[
            { icon: 'G', bg: '#fff', border: '#ddd', label: 'Continuă cu Google' },
            { icon: '🍎', bg: '#000', border: '#000', label: 'Continuă cu Apple', white: true },
            { icon: 'f', bg: '#1877F2', border: '#1877F2', label: 'Continuă cu Facebook', white: true },
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
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Email</label>
            <input type="email" placeholder="tu@exemplu.com" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Parolă</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} placeholder="Parola ta" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff size={16} className="text-[#9B9B9B]" /> : <Eye size={16} className="text-[#9B9B9B]" />}
              </button>
            </div>
            <div className="text-right mt-1.5">
              <button className="text-[12px] text-[#E8440A] font-medium">Ai uitat parola?</button>
            </div>
          </div>
        </div>

        <Link href="/onboarding" className="block w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full text-center mb-4">
          Intră în cont
        </Link>
        <p className="text-[13px] text-[#6B6B6B] text-center">
          Nu ai cont?{' '}
          <Link href="/register" className="text-[#E8440A] font-semibold">Înregistrează-te gratuit</Link>
        </p>
      </div>
    </div>
  )
}
