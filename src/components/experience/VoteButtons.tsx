'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { applyVote, type VoteType } from '@/lib/votes'
import { cn, formatCount } from '@/lib/utils'

type Props = {
  experienceId: string
  upvotes: number
  downvotes: number
  /** votul userului curent, dacă există */
  myVote?: VoteType | null
  onVoted?: (vote: VoteType | null) => void
}

export default function VoteButtons({
  experienceId,
  upvotes,
  downvotes,
  myVote = null,
  onVoted,
}: Props) {
  const router = useRouter()
  const [vote, setVote] = useState<VoteType | null>(myVote)
  const [counts, setCounts] = useState({ up: upvotes, down: downvotes })
  const [pending, setPending] = useState(false)
  const [popping, setPopping] = useState<VoteType | null>(null)
  // după prima interacțiune, starea locală e sursa adevărului
  const touched = useRef(false)

  // părintele își încarcă datele asincron — preluăm valorile până la primul click
  useEffect(() => {
    if (touched.current) return
    setVote(myVote)
    setCounts({ up: upvotes, down: downvotes })
  }, [myVote, upvotes, downvotes])

  const handleVote = async (type: VoteType) => {
    if (pending) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    touched.current = true
    setPending(true)

    const previous = { vote, counts }
    // update optimist — DB-ul recalculează contoarele prin trigger
    const optimisticVote = vote === type ? null : type
    setVote(optimisticVote)
    if (optimisticVote) {
      setPopping(type)
      setTimeout(() => setPopping(null), 350)
    }
    setCounts(c => ({
      up: c.up + ((vote === 'up' ? -1 : 0) + (optimisticVote === 'up' ? 1 : 0)),
      down: c.down + ((vote === 'down' ? -1 : 0) + (optimisticVote === 'down' ? 1 : 0)),
    }))

    const result = await applyVote(supabase, user.id, experienceId, type, previous.vote)

    if (result.error) {
      setVote(previous.vote)
      setCounts(previous.counts)
    } else {
      onVoted?.(result.vote)
    }
    setPending(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('up')}
        disabled={pending}
        aria-pressed={vote === 'up'}
        aria-label="Votează pozitiv"
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors disabled:opacity-60',
          vote === 'up'
            ? 'bg-[#5B4FCF] text-white'
            : 'bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#EEEDFB] hover:text-[#5B4FCF]',
          popping === 'up' && 'animate-pop'
        )}
      >
        <ArrowUp size={12} /> {formatCount(counts.up)}
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={pending}
        aria-pressed={vote === 'down'}
        aria-label="Votează negativ"
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors disabled:opacity-60',
          vote === 'down'
            ? 'bg-[#E8440A] text-white'
            : 'bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#FFF0EB] hover:text-[#E8440A]',
          popping === 'down' && 'animate-pop'
        )}
      >
        <ArrowDown size={12} /> {counts.down > 0 ? formatCount(counts.down) : ''}
      </button>
    </div>
  )
}
