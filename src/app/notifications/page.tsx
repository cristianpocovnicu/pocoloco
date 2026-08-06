'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, UserPlus, MessageCircle, CornerDownRight, Bell, Loader2, CheckCheck } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import EmptyState from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchNotifications, markAllRead, type NotificationItem, type NotificationType } from '@/lib/notifications'
import { timeAgo } from '@/lib/utils'

const ICONS: Record<NotificationType, { Icon: typeof ArrowUp; bg: string; color: string }> = {
  upvote: { Icon: ArrowUp, bg: '#EEEDFB', color: '#5B4FCF' },
  follow: { Icon: UserPlus, bg: '#FFF0EB', color: '#E8440A' },
  comment: { Icon: MessageCircle, bg: '#ECFDF5', color: '#059669' },
  reply: { Icon: CornerDownRight, bg: '#FFFBEB', color: '#D97706' },
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoggedIn(false); setLoading(false); return }

      const { items: list, error: loadError } = await fetchNotifications(supabase, user.id)
      setItems(list)
      setError(loadError ? 'Nu am putut încărca notificările. Încearcă din nou.' : null)
      setLoading(false)

      // deschiderea paginii le marchează citite; evidențierea rămâne
      // pentru sesiunea curentă, ca să vezi ce era nou
      if (list.some(n => !n.read)) await markAllRead(supabase, user.id)
    }
    load()
  }, [])

  const handleMarkAll = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setMarking(true)
    await markAllRead(supabase, user.id)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setMarking(false)
  }

  const unread = items.filter(n => !n.read).length

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[780px] mx-auto flex items-center gap-2">
          <Bell size={18} className="text-[#E8440A]" />
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Notificări</span>
          {unread > 0 && (
            <span className="bg-[#E8440A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
          {items.length > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={marking || unread === 0}
              className="ml-auto text-[12px] text-[#5B4FCF] font-medium flex items-center gap-1 disabled:text-[#9B9B9B]"
            >
              <CheckCheck size={13} /> Marchează toate
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-5 pt-4">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-3">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#E8440A]" />
          </div>
        ) : !loggedIn ? (
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1">Intră în cont</p>
            <p className="text-[13px] text-[#9B9B9B] mb-4">Aici vezi cine îți apreciază experiențele, cine te urmărește și cine îți comentează.</p>
            <Link href="/login" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
              Intră în cont
            </Link>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            illustration="bell"
            title="Nicio notificare încă"
            description="Aici ajung aprecierile, comentariile și urmăritorii noi. Scrie o experiență despre un loc care ți-a plăcut și n-o să dureze mult până se umple."
            action={{ href: '/add-experience', label: '+ Adaugă o experiență' }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map(n => {
              const { Icon, bg, color } = ICONS[n.type]
              const name = n.actor?.full_name || n.actor?.username || 'Cineva'

              const body = (
                <>
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                      style={{ background: colorFor(n.actor_id || n.id) }}
                    >
                      {initialsOf(n.actor?.full_name || n.actor?.username)}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ background: bg }}
                    >
                      <Icon size={10} style={{ color }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#0F0F0F] leading-snug">
                      <span className="font-semibold">{name}</span>{' '}
                      <span className="text-[#6B6B6B]">{n.text}</span>
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[#E8440A] flex-shrink-0 mt-1" />}
                </>
              )

              const className = `bg-white border rounded-2xl p-3.5 flex items-start gap-3 transition-colors ${
                n.read ? 'border-[rgba(0,0,0,0.08)]' : 'border-[rgba(232,68,10,0.25)] bg-[#FFFBF9]'
              }`

              return n.href ? (
                <Link key={n.id} href={n.href} className={`${className} hover:border-[rgba(0,0,0,0.15)]`}>
                  {body}
                </Link>
              ) : (
                <div key={n.id} className={className}>{body}</div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
