'use client'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'
import { useCurrentProfile } from '@/lib/useCurrentProfile'

/**
 * Clopoțelul din headerele mobile.
 *
 * Pe desktop nu apare: acolo notificările stau în sidebar, iar două
 * intrări pentru același lucru ar fi doar zgomot. De asta clasa implicită
 * conține `md:hidden`.
 */
export default function NotificationBell({ className }: { className?: string }) {
  const unread = useUnreadNotifications()
  const { profile } = useCurrentProfile()

  // fără cont n-ai ce notificări să vezi
  if (!profile) return null

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notificări (${unread} necitite)` : 'Notificări'}
      className={cn(
        'md:hidden relative w-9 h-9 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0',
        className
      )}
    >
      <Bell size={17} className="text-[#6B6B6B]" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#E8440A] text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
