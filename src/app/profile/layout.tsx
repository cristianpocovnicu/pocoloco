import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Propriul profil. Cel public, /profile/<username>, rămâne indexabil.
 */
export const metadata: Metadata = noIndex

export default function OwnProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
