import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Feed personal: conținutul lui e public în altă parte.
 */
export const metadata: Metadata = noIndex

export default function FollowingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
