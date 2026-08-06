'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, PenLine, Route } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase-client'

const OPTIONS = [
  {
    href: '/add-experience',
    emoji: '✍️',
    title: 'Scrie o experiență',
    subtitle: 'Ai vizitat un loc? Povestește cum a fost.',
    accent: '#E8440A',
    tint: '#FFF0EB',
    Icon: PenLine,
  },
  {
    href: '/trip/new',
    emoji: '🗺️',
    title: 'Creează o călătorie',
    subtitle: 'Leagă mai multe locuri într-un traseu cu itinerar pe zile.',
    accent: '#5B4FCF',
    tint: '#EEEDFB',
    Icon: Route,
  },
]

export default function CreatePage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
  }, [])

  // nelogat: trimitem la login, dar cu destinația păstrată
  const destination = (href: string) =>
    loggedIn === false ? `/login?next=${encodeURIComponent(href)}` : href

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[780px] mx-auto">
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Creează</span>
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-5 py-6">
        <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1.5">
          Ce vrei să adaugi?
        </h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">
          Alege cum vrei să povestești.
        </p>

        <div className="flex flex-col gap-3">
          {OPTIONS.map(option => (
            <Link
              key={option.href}
              href={destination(option.href)}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 flex items-start gap-4 hover:border-[rgba(0,0,0,0.18)] transition-colors"
              style={{ borderLeftWidth: 4, borderLeftColor: option.accent }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: option.tint }}
              >
                {option.emoji}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="font-outfit text-[17px] font-bold text-[#0F0F0F] mb-1">
                  {option.title}
                </h2>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                  {option.subtitle}
                </p>
              </div>

              {loggedIn === null
                ? <Loader2 size={16} className="animate-spin text-[#9B9B9B] mt-1 flex-shrink-0" />
                : <option.Icon size={18} style={{ color: option.accent }} className="mt-1 flex-shrink-0" />}
            </Link>
          ))}
        </div>

        <div className="bg-[#EEEDFB] border border-[rgba(91,79,207,0.15)] rounded-2xl px-4 py-3.5 mt-5 flex items-start gap-2.5">
          <span className="text-base leading-none mt-0.5">💡</span>
          <p className="text-[12px] text-[#5B4FCF] leading-relaxed">
            <strong className="font-semibold">Sfat:</strong> scrie întâi experiențele la locurile
            vizitate, apoi leagă-le într-o călătorie. Se completează automat în itinerar.
          </p>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
