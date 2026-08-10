import { BookOpen, Route } from 'lucide-react'

type Props = {
  isGuide?: boolean | null
  /** varianta peste imagine, pe fundal închis */
  onCover?: boolean
  className?: string
}

/**
 * Eticheta unei călătorii.
 *
 * Violetul e culoarea entității-călătorie, portocaliul a locului — vezi
 * codul vizual din context-produs §4. Până la 12 august 2026 era pe dos
 * aici: „CALATORIE" purta portocaliul locului, iar violetul apărea doar
 * pe „GHID". Cine derula feedul învăța culoarea greșită.
 *
 * Ghidurile sunt tot călătorii, deci rămân violete — dar sunt altă
 * entitate, așa că se despart prin **formă**: „CALATORIE" e plin,
 * „GHID" e conturat. Diferența se vede și fără să citești cuvântul, și
 * nu cere o a treia culoare într-un sistem de două.
 */
export default function TripKindBadge({ isGuide, onCover, className = '' }: Props) {
  const label = isGuide ? 'GHID' : 'CALATORIE'
  const Icon = isGuide ? BookOpen : Route

  const style = onCover
    ? isGuide
      ? 'bg-white/95 text-[#5B4FCF] ring-1 ring-inset ring-[#5B4FCF]'
      : 'bg-[#5B4FCF] text-white'
    : isGuide
      ? 'bg-white text-[#5B4FCF] ring-1 ring-inset ring-[rgba(91,79,207,0.45)]'
      : 'bg-[#EEEDFB] text-[#5B4FCF]'

  return (
    <span className={`text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${style} ${className}`}>
      <Icon size={9} /> {label}
    </span>
  )
}
