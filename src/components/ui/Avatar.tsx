'use client'
import { useState } from 'react'
import Image from 'next/image'
import { colorFor, initialsOf } from '@/lib/profiles'

/**
 * Chipul unui om, oriunde apare.
 *
 * Până pe 11 august 2026 fiecare suprafață își desena cercul ei cu
 * inițiale — vreo cincisprezece copii ale aceluiași `div` rotund. Niciuna
 * nu se uita la `avatar_url`, așa că poza încărcată de om se vedea doar
 * pe pagina lui de profil, singura scrisă după ce a apărut încărcarea.
 * Fallback-ul le acoperea pe toate: nu arăta ca un bug, arăta ca un
 * design.
 *
 * Trei lucruri stau aici, ca să nu mai fie nevoie să și le amintească
 * nimeni:
 *
 *   1. inițiala e **rezerva**, nu norma — se folosește când nu există
 *      poză sau când URL-ul moare (`onError`; fișierele din Storage pot
 *      dispărea, iar un cerc gol arată mai rău decât o inițială);
 *   2. culoarea de fundal e derivată din id, deci același om are aceeași
 *      culoare peste tot;
 *   3. poza trece prin `next/image` cu dimensiunea reală cerută — cercul
 *      de 24px din comentarii nu descarcă originalul de 2 MB.
 */

type Props = {
  /** id-ul omului: din el iese culoarea de rezervă */
  id?: string | null
  name?: string | null
  src?: string | null
  /** latura cercului, în pixeli — aceeași valoare merge și la next/image */
  size: number
  className?: string
  /** inelul de „urmărești", pe unde e nevoie */
  ring?: string
}

export default function Avatar({ id, name, src, size, className = '', ring }: Props) {
  const [broken, setBroken] = useState(false)

  const initials = initialsOf(name)
  // fără id, culoarea cade pe numele afișat: tot stabilă, doar mai grosier
  const background = colorFor(id || name || '?')
  // sub 32px, două litere la 12px n-ar mai încăpea în cerc
  const fontSize = Math.max(9, Math.round(size * 0.38))

  const shell = `rounded-full overflow-hidden flex-shrink-0 ${ring || ''} ${className}`

  if (!src || broken) {
    return (
      <div
        className={`${shell} flex items-center justify-center font-bold text-white`}
        style={{ width: size, height: size, background, fontSize }}
        aria-hidden
      >
        {initials}
      </div>
    )
  }

  /*
   * Fără `sizes`: cercul are lățime fixă, iar `sizes` îl trece pe
   * next/image în regim responsiv — generează srcset-ul complet, până la
   * 3840px, și pune cea mai mare variantă ca `src` de rezervă. Cu
   * width/height simple, srcset-ul are exact două intrări, 1x și 2x din
   * latura cerută.
   */
  return (
    <div className={`${shell} relative bg-[#F8F7F5]`} style={{ width: size, height: size }}>
      {optimizable(src) ? (
        <Image
          src={src}
          alt={name || ''}
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || ''}
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}

/**
 * Gazdele pe care le poate redimensiona optimizatorul — cele din
 * `next.config.js`.
 *
 * `next/image` refuză o gazdă neconfigurată, iar pe o poză de profil venită
 * de la un furnizor viitor asta ar însemna cerc gol în loc de chip. Pentru
 * ele cade pe un `<img>` simplu: nu se redimensionează, dar se vede.
 */
function optimizable(src: string): boolean {
  try {
    const { hostname } = new URL(src, 'https://pocoloco.travel')
    return /(\.supabase\.co|\.googleusercontent\.com|images\.unsplash\.com)$/.test(hostname)
      || hostname === 'pocoloco.travel'
  } catch {
    return false
  }
}
