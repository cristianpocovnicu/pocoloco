'use client'
import Link from 'next/link'
import { Bookmark, Calendar, Globe } from 'lucide-react'
import CoverImage from '@/components/ui/CoverImage'
import { formatCount } from '@/lib/utils'
import type { SavedTrip } from '@/lib/saves'

export default function SavedTripList({ items }: { items: SavedTrip[] }) {
  if (items.length === 0) return (
    <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
      <p className="text-[13px] text-[#9B9B9B]">
        Nicio călătorie salvată. Butonul de salvare e pe pagina fiecărei călătorii.
      </p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {items.map(({ trip }) => (
        <Link
          key={trip.id}
          href={`/trip/${trip.id}`}
          className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors"
        >
          <div className="relative w-24 flex-shrink-0 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] flex items-center justify-center text-2xl">
            {trip.cover_image
              ? <CoverImage src={trip.cover_image} sizes="96px" />
              : '🧭'}
          </div>

          <div className="flex-1 p-3.5 min-w-0">
            <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight line-clamp-2 mb-1.5">
              {trip.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {trip.duration_days && (
                <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Calendar size={10} /> {trip.duration_days} zile
                </span>
              )}
              {trip.countries && trip.countries.length > 0 && (
                <span className="text-[11px] text-[#5B4FCF] bg-[#EEEDFB] rounded-full px-2 py-0.5 flex items-center gap-1 truncate max-w-[160px]">
                  <Globe size={10} /> {trip.countries.join(', ')}
                </span>
              )}
              {(trip.save_count || 0) > 0 && (
                <span className="text-[11px] text-[#9B9B9B] flex items-center gap-1">
                  <Bookmark size={10} /> {formatCount(trip.save_count || 0)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
