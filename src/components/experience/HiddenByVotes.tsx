'use client'
import { EyeOff } from 'lucide-react'

type Props = {
  kind: 'experience' | 'comment'
  onShow: () => void
}

/**
 * Conținut pe care comunitatea l-a votat puternic negativ. Nu îl ștergem
 * și nu îl ascundem definitiv — îl strângem, ca cititorul să decidă.
 */
export default function HiddenByVotes({ kind, onShow }: Props) {
  const isExperience = kind === 'experience'

  return (
    <div className={
      isExperience
        ? 'bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-2xl px-4 py-3.5 flex items-center gap-3'
        : 'bg-[#F8F7F5] border border-[rgba(0,0,0,0.06)] rounded-2xl px-3 py-2 flex items-center gap-2'
    }>
      <EyeOff size={isExperience ? 16 : 13} className="text-[#9B9B9B] flex-shrink-0" />
      <p className={`flex-1 text-[#6B6B6B] ${isExperience ? 'text-[13px]' : 'text-[12px]'}`}>
        {isExperience
          ? 'Experiență ascunsă din cauza voturilor comunității'
          : 'Comentariu ascuns'}
      </p>
      <button
        onClick={onShow}
        className={`text-[#5B4FCF] font-medium flex-shrink-0 ${isExperience ? 'text-[12px]' : 'text-[11px]'}`}
      >
        {isExperience ? 'Arată oricum' : 'Arată'}
      </button>
    </div>
  )
}
