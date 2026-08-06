'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from './supabase-client'
import { countUnread } from './notifications'

const POLL_MS = 30_000
const SUBSCRIBE_TIMEOUT_MS = 5_000

/**
 * Numărul de notificări necitite ale userului curent.
 *
 * Încearcă Supabase Realtime, dar nu depinde de el: dacă Realtime nu e
 * activat pe proiect, dacă abonarea eșuează sau dacă nu confirmă în câteva
 * secunde, trecem pe polling la 30s. Orice eroare din realtime e prinsă —
 * hookul ăsta rulează în sidebar și în bara de jos, deci o excepție
 * aruncată aici ar lăsa tot site-ul alb.
 */
export function useUnreadNotifications(): number {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) { setUnread(0); return }

    const supabase = createClient()
    let cancelled = false
    let channel: RealtimeChannel | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let subscribeTimer: ReturnType<typeof setTimeout> | null = null

    const refresh = async () => {
      const value = await countUnread(supabase, userId)
      if (!cancelled) setUnread(value)
    }

    const startPolling = () => {
      if (pollTimer || cancelled) return
      pollTimer = setInterval(refresh, POLL_MS)
    }

    refresh()

    try {
      // nume unic de canal: sidebar-ul și bara de jos folosesc același hook,
      // iar două canale cu același topic pe același client dau eroare
      const topic = `notifications:${userId}:${Math.random().toString(36).slice(2, 9)}`
      channel = supabase.channel(topic)
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          refresh
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (subscribeTimer) { clearTimeout(subscribeTimer); subscribeTimer = null }
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            startPolling()
          }
        })

      // dacă nu confirmă nimic în câteva secunde, pornim oricum polling-ul
      subscribeTimer = setTimeout(startPolling, SUBSCRIBE_TIMEOUT_MS)
    } catch {
      channel = null
      startPolling()
    }

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (subscribeTimer) clearTimeout(subscribeTimer)
      if (channel) {
        try { supabase.removeChannel(channel) } catch { /* canalul poate fi deja închis */ }
      }
    }
  }, [userId])

  // recitim contorul la fiecare navigare (acoperă și cazul fără realtime)
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    countUnread(supabase, userId).then(setUnread)
  }, [pathname, userId])

  return unread
}
