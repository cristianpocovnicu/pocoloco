'use client'
import type { Badge, EarnedBadge } from '@/lib/badges'

type Props = {
  earned: EarnedBadge[]
  locked?: Badge[]
  /** pe profilul altcuiva nu are sens să arătăm ce n-a câștigat încă */
  showLocked?: boolean
}

export default function BadgeGrid({ earned, locked = [], showLocked }: Props) {
  if (earned.length === 0 && (!showLocked || locked.length === 0)) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
        <p className="text-[13px] text-[#9B9B9B]">Nicio insignă încă.</p>
      </div>
    )
  }

  return (
    <div>
      {earned.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {earned.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-1.5" title={badge.description}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-[#FFF0EB]"
                style={{ boxShadow: '0 0 0 2px #E8440A' }}
              >
                {badge.emoji}
              </div>
              <span className="text-[10px] text-[#6B6B6B] text-center leading-tight font-medium">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {showLocked && locked.length > 0 && (
        <>
          <h4 className="font-outfit text-[13px] font-semibold text-[#9B9B9B] mb-2.5">De câștigat</h4>
          <div className="grid grid-cols-4 gap-3">
            {locked.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-1.5 opacity-45" title={badge.description}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-[#F1F1F1] grayscale">
                  {badge.emoji}
                </div>
                <span className="text-[10px] text-[#9B9B9B] text-center leading-tight font-medium">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
