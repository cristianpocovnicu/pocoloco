'use client'
import { useEffect, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import { Loader2, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchFollowList, fetchFollowingIds, type FollowListKind, type FollowListUser } from '@/lib/follows'
import FollowButton from './FollowButton'

/**
 * Urmăritorii sau urmăriții cuiva.
 *
 * Foaie care urcă de jos pe telefon, dialog centrat pe desktop — același
 * tipar ca celelalte două modale ale aplicației. **Nu e pagină**: aceleași
 * cifre se apasă din trei locuri (profilul propriu, profilul public,
 * sidebar), iar o rută ar fi însemnat patru URL-uri noi și o întoarcere de
 * fiecare dată în pagina din spate. Prețul asumat: lista n-are link
 * propriu.
 *
 * Se încarcă la deschidere, nu la montare — și fără paginare: la zeci de
 * oameni, un fetch e mai ieftin decât mecanismul care l-ar împărți.
 */
export default function FollowListSheet({
  userId,
  kind,
  title,
  onClose,
}: {
  userId: string
  kind: FollowListKind
  title: string
  onClose: () => void
}) {
  const [people, setPeople] = useState<FollowListUser[] | null>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      const supabase = createClient()
      const list = await fetchFollowList(supabase, userId, kind)
      if (!active) return
      setPeople(list)

      // ca butoanele să pornească corect pentru cine e deja urmărit
      const { data: { user } } = await supabase.auth.getUser()
      if (user && active) setFollowingIds(await fetchFollowingIds(supabase, user.id))
    }

    load()
    return () => { active = false }
  }, [userId, kind])

  // Escape închide, ca la orice dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const empty = kind === 'followers'
    ? 'Nimeni încă — poveștile bune atrag oameni.'
    : 'Nu urmărește pe nimeni încă.'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-[440px] max-h-[85vh] flex flex-col rounded-t-2xl md:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">{title}</span>
          <button onClick={onClose} aria-label="Închide" className="w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center">
            <X size={15} className="text-[#6B6B6B]" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3">
          {people === null ? (
            <div className="py-10 flex justify-center">
              <Loader2 size={20} className="animate-spin text-[#E8440A]" />
            </div>
          ) : people.length === 0 ? (
            <p className="text-[13px] text-[#9B9B9B] py-8 text-center">{empty}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {people.map(person => (
                <div key={person.id} className="flex items-center gap-3 py-2">
                  <Link
                    href={person.username ? `/profile/${person.username}` : '#'}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar
                      id={person.id}
                      name={person.full_name || person.username}
                      src={person.avatar_url}
                      size={40}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F0F0F] truncate flex items-center gap-1">
                        {person.full_name || person.username || 'Călător'}
                        {person.is_guide && <Star size={11} className="text-[#5B4FCF] fill-[#5B4FCF] flex-shrink-0" />}
                      </p>
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        {person.username ? `@${person.username}` : ''}
                        {person.bio ? ` · ${person.bio}` : ''}
                      </p>
                    </div>
                  </Link>

                  {/* se ascunde singur pe propriul rând; pentru nelogat
                      deschide fluxul de cont cu ?next= */}
                  <FollowButton
                    targetUserId={person.id}
                    targetName={person.full_name || person.username}
                    initialFollowing={followingIds.includes(person.id)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
