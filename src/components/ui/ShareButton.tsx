'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, Link2, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'
import {
  facebookUrl,
  myReferralCode,
  recordShare,
  whatsappUrl,
  withReferral,
  type ShareContentType,
  type SharePlatform,
} from '@/lib/share'

type Props = {
  /** linkul de distribuit; implicit adresa paginii curente */
  url?: string
  title?: string
  contentType: ShareContentType
  contentId: string
  /** stilul butonului, ca să se potrivească în fiecare pagină */
  variant?: 'pill' | 'icon'
  className?: string
  label?: string
}

/**
 * Share unificat: pe telefon deschide share sheet-ul nativ, pe desktop un
 * meniu mic. Orice share reușit e înregistrat și plătit în puncte —
 * autorul conținutului primește partea mare.
 *
 * Linkul poartă ?ref=codul tău, deci un share bun poate aduce și un
 * prieten nou, nu doar vizite.
 */
export default function ShareButton({
  url,
  title,
  contentType,
  contentId,
  variant = 'pill',
  className,
  label,
}: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /** Linkul final, cu codul de invitație al userului logat. */
  const buildUrl = async () => {
    const base = url || (typeof window !== 'undefined' ? window.location.href : '')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { link: base, supabase, userId: null as string | null }

    const code = await myReferralCode(supabase, user.id)
    return { link: withReferral(base, code), supabase, userId: user.id }
  }

  const finish = async (
    platform: SharePlatform,
    supabase: ReturnType<typeof createClient>,
    userId: string | null
  ) => {
    setOpen(false)
    if (!userId) return
    await recordShare(supabase, contentType, contentId, platform)
  }

  const handleClick = async () => {
    const { link, supabase, userId } = await buildUrl()

    // pe telefon, share sheet-ul nativ e mereu mai bun decât meniul nostru
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: link })
        await finish('native', supabase, userId)
        return
      } catch {
        // userul a anulat sau browserul a refuzat — cădem pe meniu
      }
    }
    setOpen(v => !v)
  }

  const copy = async () => {
    const { link, supabase, userId } = await buildUrl()
    try {
      await navigator.clipboard.writeText(link)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
      toast('Link copiat')
    } catch {
      toast('Nu am putut copia linkul', 'error')
    }
    await finish('copy_link', supabase, userId)
  }

  const openExternal = async (platform: 'whatsapp' | 'facebook') => {
    const { link, supabase, userId } = await buildUrl()
    const target = platform === 'whatsapp' ? whatsappUrl(link, title) : facebookUrl(link)
    window.open(target, '_blank', 'noopener,noreferrer')
    await finish(platform, supabase, userId)
  }

  const button = variant === 'icon' ? (
    <button
      onClick={handleClick}
      aria-label="Distribuie"
      className={className || 'w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center'}
    >
      {done ? <Check size={16} className="text-[#059669]" /> : <Share2 size={16} className="text-[#6B6B6B]" />}
    </button>
  ) : (
    <button
      onClick={handleClick}
      className={className || 'bg-[#EEEDFB] text-[#5B4FCF] font-outfit text-[12px] font-semibold px-3 py-2 rounded-full flex items-center gap-1'}
    >
      {done ? <Check size={13} /> : <Share2 size={13} />} {label || (done ? 'Copiat' : 'Distribuie')}
    </button>
  )

  return (
    <div ref={wrapper} className="relative">
      {button}

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-lg overflow-hidden">
          <MenuItem onClick={copy} icon={<Link2 size={14} />} label="Copiază linkul" />
          <MenuItem onClick={() => openExternal('whatsapp')} icon={<span className="text-[14px]">💬</span>} label="WhatsApp" />
          <MenuItem onClick={() => openExternal('facebook')} icon={<span className="text-[14px]">📘</span>} label="Facebook" />
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#0F0F0F] hover:bg-[#F8F7F5] transition-colors text-left"
    >
      <span className="text-[#6B6B6B] flex items-center">{icon}</span>
      {label}
    </button>
  )
}
