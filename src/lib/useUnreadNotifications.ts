'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from './supabase-client'
import { countUnread } from './notifications'

/**
 * Numărul de notificări necitite ale userului curent.
 * Se actualizează prin Supabase Realtime, cu recitire la schimbarea
 * paginii ca fallback dacă Realtime e oprit pe proiect.
 */
export function useUnreadNotifications(): number {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) { setUnread(0); return }

    const supabase = createClient()
    const refresh = async () => setUnread(await countUnread(supabase, userId))
    refresh()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        refresh
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // fallback: recitim contorul la fiecare navigare
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    countUnread(supabase, userId).then(setUnread)
  }, [pathname, userId])

  return unread
}
