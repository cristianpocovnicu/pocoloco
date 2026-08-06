'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import SocialAuthButtons from '@/components/auth/SocialAuthButtons'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // de unde a venit userul: /create trimite aici cu destinația păstrată
  const next = searchParams.get('next') || '/'
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Completează email și parola.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email sau parolă incorectă.'); setLoading(false) }
    else { router.push(next); router.refresh() }
  }

  // linkul de recuperare duce în /auth/callback, care deschide sesiunea;
  // de acolo parola nouă se pune din /settings
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Scrie întâi adresa de email, apoi apasă „Ai uitat parola?".')
      return
    }
    setError(''); setNotice('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    })
    if (error) setError(error.message)
    else setNotice(`Ți-am trimis un link de resetare la ${email.trim()}. Deschide-l și pune parola nouă din Setări.`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)]">
        <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </Link>
        <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Intră în cont</span>
      </div>
      <div className="flex-1 px-6 pt-7 pb-10">
        <h1 className="font-outfit text-[26px] font-bold text-[#0F0F0F] mb-1.5">Bine ai revenit 👋</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Intră în cont și continuă să explorezi lumea cu Pocoloco.</p>
        <SocialAuthButtons next={next !== '/' ? next : undefined} />
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
          <span className="text-[12px] text-[#9B9B9B]">sau cu email</span>
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
        </div>
        {error && <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4"><p className="text-[13px] text-[#DC2626]">{error}</p></div>}
        {notice && <div className="bg-[#ECFDF5] border border-[rgba(5,150,105,0.2)] rounded-xl px-4 py-3 mb-4"><p className="text-[13px] text-[#059669]">{notice}</p></div>}
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@exemplu.com" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Parolă</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Parola ta" className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]" />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff size={16} className="text-[#9B9B9B]" /> : <Eye size={16} className="text-[#9B9B9B]" />}
              </button>
            </div>
            <div className="text-right mt-1.5">
              <button onClick={handleForgotPassword} className="text-[12px] text-[#E8440A] font-medium">Ai uitat parola?</button>
            </div>
          </div>
        </div>
        <button onClick={handleLogin} disabled={loading} className="w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full text-center mb-4 flex items-center justify-center gap-2 disabled:opacity-70">
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Se încarcă...' : 'Intră în cont'}
        </button>
        <p className="text-[13px] text-[#6B6B6B] text-center">Nu ai cont? <Link href="/register" className="text-[#E8440A] font-semibold">Înregistrează-te gratuit</Link></p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8440A] border-t-transparent animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
