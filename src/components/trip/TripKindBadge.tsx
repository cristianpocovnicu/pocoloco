import { BookOpen, Route } from 'lucide-react'

type Props = {
  isGuide?: boolean | null
  /** varianta peste imagine, pe fundal închis */
  onCover?: boolean
  className?: string
}

/**
 * Eticheta unei călătorii. Ghidurile sunt tot călătorii, doar scrise de
 * echipă — de asta diferă doar culoarea și cuvântul, nu forma.
 */
export default function TripKindBadge({ isGuide, onCover, className = '' }: Props) {
  const label = isGuide ? 'GHID' : 'CALATORIE'
  const Icon = isGuide ? BookOpen : Route

  const style = onCover
    ? isGuide
      ? 'bg-[#5B4FCF] text-white'
      : 'bg-[#E8440A] text-white'
    : isGuide
      ? 'bg-[#EEEDFB] text-[#5B4FCF]'
      : 'bg-[#FFF0EB] text-[#E8440A]'

  return (
    <span className={`text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${style} ${className}`}>
      <Icon size={9} /> {label}
    </span>
  )
}
