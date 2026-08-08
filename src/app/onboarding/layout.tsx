import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Pagină privată.
 */
export const metadata: Metadata = noIndex

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
