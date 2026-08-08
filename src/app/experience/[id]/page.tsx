import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import BackButton from '@/components/ui/BackButton'
import PhotoGallery from '@/components/location/PhotoGallery'
import ExperienceInteractions from '@/components/experience/ExperienceInteractions'
import FollowButton from '@/components/profile/FollowButton'
import ShareButton from '@/components/ui/ShareButton'
import PendingChip from '@/components/location/PendingChip'
import { supabase } from '@/lib/supabase'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchCommentsFor } from '@/lib/comments'
import { activityCategory, ratingLabels } from '@/lib/activities'
import { timeAgo } from '@/lib/utils'
import { formatVisitedPeriod } from '@/lib/period'
import { getExperienceSeo } from '@/lib/seo'

/**
 * Pagina unei experiențe — randată pe server.
 *
 * Textul, pozele, notele și comentariile sunt în HTML-ul servit: aici stă
 * ce a scris omul, deci aici avea cel mai mult de pierdut un crawler care
 * primea un schelet gol.
 *
 * Citim cu clientul anon, fără cookies. Ce ține de vizitator — votul lui,
 * dreptul de a șterge un comentariu — se află după hidratare, în insule.
 * Dacă am fi citit sesiunea aici, ruta ar fi devenit dinamică și n-ar mai
 * fi putut fi cachează.
 */
export const revalidate = 300

export default async function ExperiencePage({ params }: { params: { id: string } }) {
  const experience = await getExperienceSeo(params.id)

  if (!experience) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">🧭</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Experiența nu există</p>
      <p className="text-[13px] text-[#6B6B6B]">Poate a fost ștearsă între timp.</p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  const threads = await fetchCommentsFor(supabase, [experience.id])
  const comments = threads[experience.id] || []

  const visited = formatVisitedPeriod(experience.visited_year, experience.visited_month)
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
  ].filter(rating => (rating.value || 0) > 0)

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <BackButton />
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
          {category && (
            <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#EEEDFB] text-[#5B4FCF] inline-block mb-2">
              {category.emoji} {category.label.toUpperCase()}
            </span>
          )}

          <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F] leading-tight mb-1">{heading}</h1>

          {experience.kind === 'activity' ? (
            experience.activity_area && (
              <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1">
                <MapPin size={12} /> {experience.activity_area}
              </p>
            )
          ) : experience.location && (
            <p className="text-[13px] flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/location/${experience.location.id}`}
                className="text-[#5B4FCF] flex items-center gap-1"
              >
                <MapPin size={12} /> {experience.location.name}
                {experience.location.city ? `, ${experience.location.city}` : ''}
              </Link>
              {/* doar autorul și adminii îl văd — vezi PendingChip */}
              <PendingChip locationId={experience.location.id} />
            </p>
          )}
        </div>

        {experience.author && (
          <div className="bg-white px-5 py-3 flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.08)]">
            <Link
              href={experience.author.username ? `/profile/${experience.author.username}` : '#'}
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
                <p className="text-[11px] text-[#9B9B9B]">
                  {timeAgo(experience.created_at)}
                  {visited && <span> · a fost în {visited}</span>}
                </p>
              </div>
            </Link>
            {/* butonul se ascunde singur când te uiți la propria experiență */}
            <FollowButton
              targetUserId={experience.author.id}
              targetName={experience.author.full_name || experience.author.username || 'călător'}
            />
          </div>
        )}

        {images.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <PhotoGallery images={images} />
          </div>
        )}

        {/* aceeași grupare ca pe cardul din pagina locului: notele sunt
            metadate, iar ochiul trebuie să vadă unde se termină ele */}
        {ratings.length > 0 && (
          <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <div className="bg-[#F8F7F5] rounded-xl px-3.5 py-2.5">
              {ratings.map((rating, index) => (
                <div
                  key={rating.label}
                  className={`flex items-center justify-between ${index < ratings.length - 1 ? 'mb-2' : ''}`}
                >
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
          </div>
        )}

        <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          {/* textul integral: pagina asta e originalul, nu rezumatul */}
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

          <ExperienceInteractions
            experienceId={experience.id}
            upvotes={experience.upvotes}
            downvotes={experience.downvotes}
            comments={comments}
          />
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
