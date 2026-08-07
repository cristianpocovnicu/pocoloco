'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, Star } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import PhotoGallery from '@/components/location/PhotoGallery'
import VoteButtons from '@/components/experience/VoteButtons'
import CommentThread, { type CommentViewer } from '@/components/experience/CommentThread'
import FollowButton from '@/components/profile/FollowButton'
import ShareButton from '@/components/ui/ShareButton'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchMyVotes, type VoteType } from '@/lib/votes'
import { fetchCommentsFor, type CommentWithAuthor } from '@/lib/comments'
import { activityCategory, ratingLabels, type ExperienceKind } from '@/lib/activities'
import { timeAgo } from '@/lib/utils'

type Experience = {
  id: string
  kind: ExperienceKind
  title: string | null
  activity_category: string | null
  activity_area: string | null
  content: string
  images: string[] | null
  tips: string[] | null
  rating_experience: number
  rating_access: number | null
  rating_crowd: number | null
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  status: string
  author_id: string
  location_id: string | null
  author: { id: string; username: string | null; full_name: string | null; is_guide: boolean | null } | null
  location: { id: string; name: string; city: string | null } | null
}

/**
 * Pagina unei experiențe.
 *
 * Activitățile n-au pagină de locație unde să stea, deci au nevoie de una
 * proprie: de aici se deschid din feed, de aici se distribuie. Experiențele
 * de loc funcționează la fel, chiar dacă locul lor obișnuit rămâne pagina
 * locației.
 */
export default function ExperiencePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [experience, setExperience] = useState<Experience | null>(null)
  const [viewer, setViewer] = useState<CommentViewer>(null)
  const [myVote, setMyVote] = useState<VoteType | null>(null)
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('experiences')
        .select(`
          id, kind, title, activity_category, activity_area, content, images, tips,
          rating_experience, rating_access, rating_crowd,
          upvotes, downvotes, comment_count, created_at, status, author_id, location_id,
          author:profiles!author_id(id, username, full_name, is_guide),
          location:locations!location_id(id, name, city)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) setLoadError(true)
      if (!data) { setLoading(false); return }

      const row = data as unknown as Experience
      setExperience(row)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).maybeSingle()
        setViewer({ id: user.id, isAdmin: profile?.role === 'admin' })

        const votes = await fetchMyVotes(supabase, [row.id])
        setMyVote(votes[row.id] ?? null)
      }

      const threads = await fetchCommentsFor(supabase, [row.id])
      setComments(threads[row.id] || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (!experience || (experience.status !== 'active' && viewer?.id !== experience.author_id)) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">{loadError ? '📡' : '🧭'}</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">
        {loadError ? 'Nu am putut încărca experiența' : 'Experiența nu există'}
      </p>
      <p className="text-[13px] text-[#6B6B6B]">
        {loadError ? 'Verifică conexiunea și reîncarcă pagina.' : 'Poate a fost ștearsă între timp.'}
      </p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  const category = activityCategory(experience.activity_category)
  const labels = ratingLabels(experience.kind)
  const images = experience.images || []
  const heading = experience.kind === 'activity'
    ? (experience.title || 'Activitate')
    : (experience.location?.name || 'Experiență')

  const ratings = [
    { label: labels.experience, value: experience.rating_experience },
    { label: labels.access, value: experience.rating_access },
    { label: labels.crowd, value: experience.rating_crowd },
  ].filter(r => (r.value || 0) > 0)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
          aria-label="Înapoi"
        >
          <ArrowLeft size={16} className="text-[#6B6B6B]" />
        </button>
        <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate flex-1">{heading}</span>
        <ShareButton
          contentType="experience"
          contentId={experience.id}
          title={heading}
          variant="icon"
        />
      </div>

      <div className="max-w-[780px] mx-auto">
        <div className="bg-white px-5 py-5 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {category && (
              <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#EEEDFB] text-[#5B4FCF]">
                {category.emoji} {category.label.toUpperCase()}
              </span>
            )}
            {experience.status !== 'active' && (
              <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706]">
                CIORNĂ
              </span>
            )}
          </div>

          <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F] leading-tight mb-1">{heading}</h1>

          {experience.kind === 'activity' ? (
            experience.activity_area && (
              <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1">
                <MapPin size={12} /> {experience.activity_area}
              </p>
            )
          ) : experience.location && (
            <Link
              href={`/location/${experience.location.id}`}
              className="text-[13px] text-[#5B4FCF] flex items-center gap-1"
            >
              <MapPin size={12} /> {experience.location.name}
              {experience.location.city ? `, ${experience.location.city}` : ''}
            </Link>
          )}
        </div>

        {/* Autor */}
        {experience.author && (
          <div className="bg-white px-5 py-3 flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.08)]">
            <Link
              href={`/profile/${experience.author.username}`}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: colorFor(experience.author.id) }}
              >
                {initialsOf(experience.author.full_name || experience.author.username)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#0F0F0F] truncate">
                  {experience.author.full_name || experience.author.username}
                </p>
                <p className="text-[11px] text-[#9B9B9B]">{timeAgo(experience.created_at)}</p>
              </div>
            </Link>
            {viewer && viewer.id !== experience.author.id && (
              <FollowButton
                targetUserId={experience.author.id}
                targetName={experience.author.full_name || experience.author.username || 'călător'}
              />
            )}
          </div>
        )}

        {images.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <PhotoGallery images={images} />
          </div>
        )}

        {ratings.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            {ratings.map(rating => (
              <div key={rating.label} className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-[#6B6B6B]">{rating.label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={14}
                      className={i <= (rating.value || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <p className="text-[14px] text-[#0F0F0F] leading-relaxed whitespace-pre-line">{experience.content}</p>

          {experience.tips && experience.tips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {experience.tips.map(tip => (
                <span key={tip} className="text-[11px] bg-[#FFF0EB] text-[#E8440A] px-2 py-0.5 rounded-full">
                  ✓ {tip}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.06)]">
            <VoteButtons
              target={{ kind: 'experience', id: experience.id }}
              upvotes={experience.upvotes}
              downvotes={experience.downvotes}
              myVote={myVote}
            />
          </div>
        </div>

        <div className="bg-white px-5 py-4">
          <CommentThread
            experienceId={experience.id}
            initialComments={comments}
            viewer={viewer}
          />
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
