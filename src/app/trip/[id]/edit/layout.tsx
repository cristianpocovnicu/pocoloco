import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Ecran de editare: aceeași călătorie e publică la /trip/<id>.
 */
export const metadata: Metadata = noIndex

export default function TripEditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
