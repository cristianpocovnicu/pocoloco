'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { applyStoredReferral, readStoredReferral, storeReferralCode } from '@/lib/referrals'

/**
 * Prinde `?ref=COD` de pe orice pagină și îl ține deoparte până când
 * omul își face cont — atunci îl legăm de cel care l-a invitat.
 *
 * Citim adresa din `window.location`, nu cu useSearchParams: altfel
 * fiecare pagină statică ar avea nevoie de un <Suspense> în jur.
 */
export default function ReferralCapture() {
  const pathname = usePathname()

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return

      const code = new URLSearchParams(window.location.search).get('ref')
      if (code) {
        storeReferralCode(code)
        // scoatem parametrul din bara de adrese, ca linkul copiat mai
        // departe să nu ducă toată lumea la același invitator
        const url = new URL(window.location.href)
        url.searchParams.delete('ref')
        window.history.replaceState({}, '', url.toString())
      }

      if (!readStoredReferral()) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await applyStoredReferral(supabase)
    }
    run()
  }, [pathname])

  return null
}
