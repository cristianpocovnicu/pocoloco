'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuthGate } from '@/components/auth/AuthGate'
import { isFollowing as checkFollowing, setFollow } from '@/lib/follows'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

type Props = {
  targetUserId: string
  /** dacă părintele știe deja starea, evităm un query în plus */
  initialFollowing?: boolean
  /** numele afișat în confirmare; fără el mesajul rămâne generic */
  targetName?: string | null
  size?: 'sm' | 'md'
  className?: string
  onChange?: (following: boolean) => void
}

export default function FollowButton({
  targetUserId,
  initialFollowing,
  targetName,
  size = 'md',
  className,
  onChange,
}: Props) {
  const router = useRouter()
  const gate = useAuthGate()
  const [following, setFollowing] = useState(!!initialFollowing)
  const [meId, setMeId] = useState<string | null>(null)
  const [ready, setReady] = useState(initialFollowing !== undefined)
  const [pending, setPending] = useState(false)
  const [justChanged, setJustChanged] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      setMeId(user?.id ?? null)

      if (user && initialFollowing === undefined && user.id !== targetUserId) {
        const current = await checkFollowing(supabase, user.id, targetUserId)
        if (active) setFollowing(current)
      }
      if (active) setReady(true)
    }
    load()
    return () => { active = false }
  }, [targetUserId, initialFollowing])

  // nu-ți afișăm buton de follow pe propriul profil
  if (meId && meId === targetUserId) return null

  const handleClick = async () => {
    if (pending) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { gate('Urmărește călătorii ale căror povești vrei să le vezi.'); return }

    const next = !following
    setPending(true)
    setFollowing(next) // optimist

    const error = await setFollow(supabase, user.id, targetUserId, next)
    if (error) {
      setFollowing(!next)
      toast('Nu am putut salva. Încearcă din nou.', 'error')
    } else {
      onChange?.(next)
      setJustChanged(true)
      setTimeout(() => setJustChanged(false), 350)
      toast(next
        ? `Urmărești acum pe ${targetName || 'acest călător'}`
        : 'Nu mai urmărești')
    }

    setPending(false)
  }

  const small = size === 'sm'

  return (
    <button
      onClick={handleClick}
      disabled={pending || !ready}
      aria-pressed={following}
      className={cn(
        'font-outfit font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60',
        small ? 'text-[12px] px-3 py-1.5' : 'text-[13px] px-4 py-2',
        following
          ? 'bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:border-[rgba(220,38,38,0.2)]'
          : 'bg-[#E8440A] text-white hover:bg-[#D03D09]',
        justChanged && 'animate-pop',
        className
      )}
    >
      {pending
        ? <Loader2 size={small ? 12 : 14} className="animate-spin" />
        : following
          ? <UserCheck size={small ? 12 : 14} />
          : <UserPlus size={small ? 12 : 14} />}
      {following ? 'Urmărești' : 'Urmărește'}
    </button>
  )
}
