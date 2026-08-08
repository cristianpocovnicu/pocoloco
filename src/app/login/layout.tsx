import type { Metadata } from 'next'
import { noIndex } from '@/lib/seo'

/**
 * Pagină de autentificare.
 */
export const metadata: Metadata = noIndex

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
