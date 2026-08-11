'use client'
import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Pencil, Star, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatCount, timeAgo } from '@/lib/utils'
import { formatVisitedPeriod } from '@/lib/period'
import { ratingLabels } from '@/lib/activities'
import { fetchMyVotes, netScore, HIDE_THRESHOLD_EXPERIENCE, type VoteType } from '@/lib/votes'
import type { CommentWithAuthor } from '@/lib/comments'
import type { LocationExperience } from '@/lib/seo'
import VoteButtons from './VoteButtons'
import HiddenByVotes from './HiddenByVotes'
import CommentThread, { type CommentViewer } from './CommentThread'
import FollowButton from '@/components/profile/FollowButton'
import ExperienceEditModal, { type EditableExperience } from './ExperienceEditModal'
import ExpandableText from '@/components/ui/ExpandableText'

const LABELS = ratingLabels('place_visit')
/** Cât se arată din text înainte de „Citește tot". */
const PREVIEW = 300

const initials = (name: string) =>
  name?.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2) || '??'

type Props = {
  experience: LocationExperience
  /** locul de pe care se citește cardul — pentru recalcularea copertelor */
  locationId: string
  /** aduse de pe server: firul e complet încă din primul HTML */
  comments: CommentWithAuthor[]
}

/**
 * O recenzie, pe pagina locului.
 *
 * Componenta e client pentru ce se poate face cu ea — vot, comentarii,
 * editare —, dar primește tot conținutul ca props: textul, notele și
 * pozele sunt în HTML-ul servit, nu aduse după hidratare.
 *
 * Textul e întreg în HTML și tăiat doar din CSS: „Citește tot" îl
 * dezvăluie pe loc, fără să te scoată din pagină. A fost o vreme trunchiat
 * pe server, cu link spre pagina experienței, ca aceleași cuvinte să nu
 * concureze în index cu pagina lor — dar lectura comparativă (trei păreri
 * despre același loc, una sub alta) valorează mai mult decât riscul mic de
 * duplicare hub/sursă, iar canonical-urile rămân corecte pe ambele pagini.
 */
export default function ExperienceCard({ experience, comments, locationId }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [viewer, setViewer] = useState<CommentViewer>(null)
  const [myVote, setMyVote] = useState<VoteType | null>(null)
  const [editing, setEditing] = useState<EditableExperience | null>(null)
  const [row, setRow] = useState(experience)
  const [deleted, setDeleted] = useState(false)
  const [commentCount, setCommentCount] = useState(experience.comment_count)
  const cardRef = useRef<HTMLDivElement>(null)

  // cine se uită se află abia în browser: pagina e aceeași pentru toți
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

      const votes = await fetchMyVotes(supabase, [experience.id])
      if (active) setMyVote(votes[experience.id] ?? null)
    }
    load()
    return () => { active = false }
  }, [experience.id])

  const remove = async () => {
    if (!window.confirm('Ștergi experiența? Comentariile și voturile ei dispar odată cu ea.')) return
    const supabase = createClient()
    const { error } = await supabase.from('experiences').delete().eq('id', row.id)
    if (error) {
      window.alert(`Nu am putut șterge experiența: ${error.message}`)
      return
    }
    setDeleted(true)
  }

  if (deleted) return null

  const hidden = netScore(row.upvotes, row.downvotes) <= HIDE_THRESHOLD_EXPERIENCE && !revealed
  if (hidden) return (
    <div className="mb-3">
      <HiddenByVotes kind="experience" onShow={() => setRevealed(true)} />
    </div>
  )

  const period = formatVisitedPeriod(row.visited_year, row.visited_month)
  const text = row.content.trim()

  const ratings = [
    { label: LABELS.experience, value: row.rating_experience },
    { label: LABELS.access, value: row.rating_access },
    { label: LABELS.crowd, value: row.rating_crowd },
  ].filter(rating => rating.value)

  return (
    <div ref={cardRef} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden mb-3 scroll-mt-16">
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={row.author?.username ? `/profile/${row.author.username}` : '#'}
            className="flex items-center gap-2 min-w-0 flex-1"
          >
            <Avatar
              id={row.author?.id}
              name={row.author?.full_name}
              src={row.author?.avatar_url}
              size={32}
            />
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-[#0F0F0F]">{row.author?.full_name}</span>
              {row.author?.is_guide && (
                <span className="ml-1.5 text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-medium">Ghid</span>
              )}
              <div className="text-[11px] text-[#9B9B9B]">
                {timeAgo(row.created_at)}
                {period && <span> · a fost în {period}</span>}
              </div>
            </div>
          </Link>

          {viewer && row.author?.id === viewer.id ? (
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => setEditing({
                  id: row.id,
                  kind: 'place_visit',
                  images: row.images || [],
                  location_id: locationId,
                  content: row.content,
                  visited_year: row.visited_year,
                  visited_month: row.visited_month,
                  rating_experience: row.rating_experience,
                  rating_access: row.rating_access,
                  rating_crowd: row.rating_crowd,
                })}
                className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
              >
                <Pencil size={11} /> Editează
              </button>
              <button
                onClick={remove}
                className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
              >
                <Trash2 size={11} /> Șterge
              </button>
            </div>
          ) : (
            row.author?.id && (
              <FollowButton targetUserId={row.author.id} targetName={row.author.full_name} size="sm" />
            )
          )}
        </div>

        {/* Notele stau grupate pe fundal propriu: sunt metadate, nu
            povestea. Fără delimitare, primul paragraf părea al patrulea
            rând de stele. */}
        {ratings.length > 0 && (
          <div className="bg-[#F8F7F5] rounded-xl px-3 py-2 mb-5">
            {ratings.map((rating, index) => (
              <div
                key={rating.label}
                className={`flex items-center justify-between ${index < ratings.length - 1 ? 'mb-1.5' : ''}`}
              >
                <span className="text-[12px] text-[#6B6B6B]">{rating.label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={11}
                      className={i <= (rating.value || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aceeași componentă ca în itinerarul unei călătorii: textul e
            întreg în DOM, tăiat doar vizual, iar „Citește tot" comută o
            clasă. Pagina proprie rămâne destinația pentru vot și
            comentarii în contextul lor, nu pentru citit. */}
        <ExpandableText
          text={text}
          threshold={PREVIEW}
          lines={7}
          className="text-[13px] text-[#6B6B6B] leading-relaxed"
          actionClassName="text-[12px] text-[#5B4FCF]"
          scrollTo={cardRef}
          footer={
            <Link
              href={`/experience/${row.id}`}
              className="text-[12px] text-[#9B9B9B] font-medium mt-1 ml-3 inline-block"
            >
              Vezi experiența →
            </Link>
          }
        />

        {row.tips && row.tips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {row.tips.map(tip => (
              <span key={tip} className="text-[11px] bg-[#FFF0EB] text-[#E8440A] px-2 py-0.5 rounded-full">✓ {tip}</span>
            ))}
          </div>
        )}
      </div>

      {row.images && row.images.length > 0 && (
        <div className="flex gap-1.5 px-3.5 pb-3 overflow-x-auto scrollbar-hide">
          {row.images.map((img, i) => (
            <Image key={i} src={img} alt="" width={80} height={80} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ))}
        </div>
      )}

      <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <VoteButtons
            target={{ kind: 'experience', id: row.id }}
            upvotes={row.upvotes}
            downvotes={row.downvotes}
            myVote={myVote}
          />
          <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
            <MessageCircle size={12} /> {formatCount(commentCount)}
          </div>
        </div>
      </div>

      <CommentThread
        experienceId={row.id}
        initialComments={comments}
        viewer={viewer}
        onCountChange={delta => setCommentCount(count => Math.max(0, count + delta))}
      />

      {editing && (
        <ExperienceEditModal
          experience={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setRow(prev => ({ ...prev, ...updated, content: updated.content }))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
