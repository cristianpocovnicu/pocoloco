import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Rezultatele de căutare sunt conținut subțire și duplicat: Google
 * descurajează explicit indexarea lor.
 */
export const metadata: Metadata = noIndex

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
