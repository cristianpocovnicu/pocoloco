'use client'
import Link from 'next/link'
import { CheckCircle, Loader2, MapPin } from 'lucide-react'
import CoverImage from '@/components/ui/CoverImage'
import { CATEGORY_ICONS } from '@/lib/utils'
import type { SavedLocation } from '@/lib/saves'

type Props = {
  items: SavedLocation[]
  loading?: boolean
  emptyTitle: string
  emptyDescription: string
  /** apare doar pe „Vreau să merg", ca scurtătură către „Am fost" */
  onMarkVisited?: (locationId: string) => void
  busyId?: string | null
}

export default function SavedLocationList({
  items,
  loading,
  emptyTitle,
  emptyDescription,
  onMarkVisited,
  busyId,
}: Props) {
  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 size={22} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (items.length === 0) return (
    <div className="text-center py-10 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
      <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">{emptyTitle}</p>
      <p className="text-[13px] text-[#9B9B9B] max-w-[300px] mx-auto leading-relaxed">{emptyDescription}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {items.map(({ location }) => (
        <div key={location.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex">
          <Link href={`/location/${location.id}`} className="relative w-24 flex-shrink-0 bg-[#F8F7F5] flex items-center justify-center text-3xl">
            {location.cover_image
              ? <CoverImage src={location.cover_image} sizes="96px" />
              : (CATEGORY_ICONS[location.category || ''] || '📍')}
          </Link>

          <div className="flex-1 p-3.5 min-w-0">
            <Link href={`/location/${location.id}`} className="block">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight truncate">
                  {location.name}
                </h3>
                {(location.score || 0) > 0 && (
                  <span className="bg-[#E8440A] text-white font-outfit text-[11px] font-bold px-2 py-0.5 rounded-xl flex-shrink-0">
                    {location.score?.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#9B9B9B] flex items-center gap-1 truncate">
                <MapPin size={11} /> {location.city || 'Fără oraș'}{location.country ? `, ${location.country}` : ''}
              </p>
            </Link>

            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] text-[#9B9B9B]">
                {location.experience_count || 0} experiențe
              </span>
              {onMarkVisited && (
                <button
                  onClick={() => onMarkVisited(location.id)}
                  disabled={busyId === location.id}
                  className="text-[11px] bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {busyId === location.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <CheckCircle size={11} />}
                  Am fost
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
