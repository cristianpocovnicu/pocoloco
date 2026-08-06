'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

type Provider = 'google' | 'facebook'

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.1 35.6 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

/** Butoanele de autentificare cu furnizori externi, comune pentru login și register. */
export default function SocialAuthButtons({ next }: { next?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (provider: Provider) => {
    setLoading(provider)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })

    // dacă merge, browserul pleacă spre furnizor și nu mai ajungem aici
    if (oauthError) {
      const name = provider === 'google' ? 'Google' : 'Facebook'
      setError(
        /not enabled|unsupported provider/i.test(oauthError.message)
          ? `Autentificarea cu ${name} nu e activată încă pe server.`
          : oauthError.message
      )
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 mb-5">
      {error && (
        <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
          <p className="text-[13px] text-[#DC2626]">{error}</p>
        </div>
      )}

      <button
        onClick={() => signIn('google')}
        disabled={loading !== null}
        className="w-full py-3.5 rounded-full border border-[#ddd] bg-white flex items-center justify-center gap-2.5 font-outfit text-[14px] font-medium hover:bg-[#F8F7F5] transition-colors disabled:opacity-60"
      >
        {loading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
        {loading === 'google' ? 'Te ducem la Google...' : 'Continuă cu Google'}
      </button>

      <button
        onClick={() => signIn('facebook')}
        disabled={loading !== null}
        className="w-full py-3.5 rounded-full bg-[#1877F2] text-white flex items-center justify-center gap-2.5 font-outfit text-[14px] font-medium hover:bg-[#166FE0] transition-colors disabled:opacity-60"
      >
        {loading === 'facebook' ? <Loader2 size={16} className="animate-spin" /> : <FacebookLogo />}
        {loading === 'facebook' ? 'Te ducem la Facebook...' : 'Continuă cu Facebook'}
      </button>
    </div>
  )
}
