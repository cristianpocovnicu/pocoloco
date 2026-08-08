'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import type { CommentWithAuthor } from '@/lib/comments'
import VoteButtons from './VoteButtons'
import CommentThread, { type CommentViewer } from './CommentThread'

/**
 * Votul și firul de comentarii de pe pagina unei experiențe.
 *
 * Comentariile vin de pe server, deci se citesc din primul HTML.
 * Ce ține de cine se uită — votul propriu, dreptul de a șterge — se află
 * după hidratare: pagina rămâne aceeași pentru toți și se poate cachea.
 */
export default function ExperienceInteractions({
  experienceId,
  upvotes,
  downvotes,
  comments,
}: {
  experienceId: string
  upvotes: number
  downvotes: number
  comments: CommentWithAuthor[]
}) {
  const [viewer, setViewer] = useState<CommentViewer>(null)
  const [myVote, setMyVote] = useState<VoteType | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!active) return
      setViewer({ id: user.id, isAdmin: profile?.role === 'admin' })

      const votes = await fetchMyVotes(supabase, [experienceId])
      if (active) setMyVote(votes[experienceId] ?? null)
    }
    load()
    return () => { active = false }
  }, [experienceId])

  return (
    <>
      <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.06)]">
        <VoteButtons
          target={{ kind: 'experience', id: experienceId }}
          upvotes={upvotes}
          downvotes={downvotes}
          myVote={myVote}
        />
      </div>

      <div className="bg-white px-5 py-4 -mx-5 mt-4 -mb-4">
        <CommentThread
          experienceId={experienceId}
          initialComments={comments}
          viewer={viewer}
        />
      </div>
    </>
  )
}
