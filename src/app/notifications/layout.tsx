import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Pagină privată.
 */
export const metadata: Metadata = noIndex

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
