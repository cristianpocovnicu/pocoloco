'use client'
import { useEffect, useState } from 'react'
import { Check, Copy, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchReferralStats, type ReferralStats } from '@/lib/referrals'
import { useToast } from '@/components/ui/Toast'
import ShareButton from '@/components/ui/ShareButton'

/**
 * „Invită prieteni": linkul tău personal și cât ai strâns din el.
 *
 * Recompensa nu vine la înregistrare, ci când prietenul chiar începe să
 * folosească aplicația — altfel ar fi o invitație la conturi goale.
 */
export default function InviteFriends({ userId }: { userId: string }) {
  const toast = useToast()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const data = await fetchReferralStats(createClient(), userId)
      if (active) setStats(data)
    }
    load()
    return () => { active = false }
  }, [userId])

  // fără cod (migrarea de invitații nu e rulată) nu are ce arăta
  if (!stats?.code) return null

  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://pocoloco.travel'}/?ref=${stats.code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Link de invitație copiat')
    } catch {
      toast('Nu am putut copia linkul', 'error')
    }
  }

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={16} className="text-[#E8440A]" />
        <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Invită prieteni</h2>
      </div>
      <p className="text-[12px] text-[#6B6B6B] leading-relaxed mb-3">
        Primești 15 puncte pentru fiecare prieten care intră pe linkul tău și începe să
        folosească Pocoloco. Și el primește 5 puncte de bun venit.
      </p>

      <div className="flex items-center gap-2 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3 py-2 mb-2.5">
        <span className="flex-1 min-w-0 text-[12px] text-[#0F0F0F] truncate font-mono">{link}</span>
        <button
          onClick={copy}
          aria-label="Copiază linkul de invitație"
          className="w-7 h-7 rounded-lg bg-white border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
        >
          {copied ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} className="text-[#6B6B6B]" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-[#9B9B9B]">
          {stats.rewarded}/{stats.limit} invitații recompensate
          {stats.signedUp > stats.rewarded && ` · ${stats.signedUp - stats.rewarded} încă nu s-au activat`}
        </p>
        <ShareButton
          contentType="profile"
          contentId={userId}
          url={link}
          title="Hai pe Pocoloco"
          label="Trimite invitația"
        />
      </div>

      {stats.rewarded >= stats.limit && (
        <p className="text-[11px] text-[#9B9B9B] mt-2">
          Ai atins plafonul de invitații plătite. Linkul rămâne valabil, doar punctele se opresc.
        </p>
      )}
    </div>
  )
}
