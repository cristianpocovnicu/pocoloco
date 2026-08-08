import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Ecranul de scris, nu de citit.
 */
export const metadata: Metadata = noIndex

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
