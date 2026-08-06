'use client'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { colorFor, initialsOf } from '@/lib/profiles'
import type { SuggestedUser } from '@/lib/follows'
import FollowButton from './FollowButton'

type Props = {
  users: SuggestedUser[]
  /**
   * Cine e deja urmărit. Sugestiile îi exclud pe cei urmăriți, deci acolo
   * lipsește; la căutare e nevoie, altfel butonul zice „Urmărește" pentru
   * cineva pe care îl urmărești deja.
   */
  followingIds?: string[]
}

export default function UserSuggestionList({ users, followingIds }: Props) {
  if (users.length === 0) {
    return (
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl py-10 text-center">
        <p className="text-[13px] text-[#9B9B9B]">Încă nu avem pe cine să-ți sugerăm.</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-2.5">
      {users.map(u => (
        <div key={u.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex items-center gap-3">
          <Link href={`/profile/${u.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-outfit text-[14px] font-bold text-white"
                style={{ background: colorFor(u.id) }}
              >
                {initialsOf(u.full_name || u.username)}
              </div>
              {u.is_guide && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
                  <Star size={9} className="text-white fill-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
                {u.full_name || u.username}
              </p>
              <p className="text-[11px] text-[#9B9B9B] truncate">
                @{u.username} · {u.experienceCount} {u.experienceCount === 1 ? 'experiență' : 'experiențe'}
              </p>
            </div>
          </Link>
          <FollowButton
            targetUserId={u.id}
            targetName={u.full_name || u.username}
            initialFollowing={followingIds ? followingIds.includes(u.id) : false}
            size="sm"
            className="flex-shrink-0"
          />
        </div>
      ))}
    </div>
  )
}
