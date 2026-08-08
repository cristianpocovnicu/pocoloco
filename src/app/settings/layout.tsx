import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Pagină privată.
 */
export const metadata: Metadata = noIndex

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
