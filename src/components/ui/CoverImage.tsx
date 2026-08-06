'use client'
import Image from 'next/image'

type Props = {
  src: string
  alt?: string
  /** lățimea reală la care se afișează, ca browserul să nu ceară un fișier prea mare */
  sizes?: string
  priority?: boolean
  className?: string
}

/**
 * Imagine care umple containerul părinte — care trebuie să fie `relative`.
 * Încarcă lazy implicit; `priority` doar pentru cea de sus a paginii.
 */
export default function CoverImage({
  src,
  alt = '',
  sizes = '(max-width: 768px) 100vw, 680px',
  priority,
  className = 'object-cover',
}: Props) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
}
