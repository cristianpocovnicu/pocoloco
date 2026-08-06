'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import SocialAuthButtons from '@/components/auth/SocialAuthButtons'

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !email || !password) { setError('Completează toate câmpurile.'); return }
    if (!agreed) { setError('Trebuie să accepți termenii și condițiile.'); return }
    if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">📧</div>
      <h1 className="font-outfit text-[24px] font-bold text-[#0F0F0F] mb-3">Verifică email-ul!</h1>
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">Am trimis un link de confirmare la <strong>{email}</strong>. Apasă pe link și contul tău e activ!</p>
      <Link href="/login" className="bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 px-8 rounded-full">Mergi la Login</Link>
    </div>
  )

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
        <SocialAuthButtons next="/onboarding" />
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
          <span className="text-[12px] text-[#9B9B9B]">sau cu email</span>
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
        </div>
        {error && <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4"><p className="text-[13px] text-[#DC2626]">{error}</p></div>}
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Nume complet</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: Maria Popescu" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@exemplu.com" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Parolă</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minim 8 caractere" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
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
          <p className="text-[12px] text-[#6B6B6B] leading-relaxed">Accept <span className="text-[#E8440A] font-medium">Termenii și condițiile</span> și <span className="text-[#E8440A] font-medium">Politica de confidențialitate</span> Pocoloco.</p>
        </button>
        <button onClick={handleRegister} disabled={loading} className="w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full text-center mb-4 flex items-center justify-center gap-2 disabled:opacity-70">
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Se creează contul...' : 'Creează cont gratuit'}
        </button>
        <p className="text-[13px] text-[#6B6B6B] text-center">Ai deja cont? <Link href="/login" className="text-[#E8440A] font-semibold">Intră în cont</Link></p>
      </div>
    </div>
  )
}
