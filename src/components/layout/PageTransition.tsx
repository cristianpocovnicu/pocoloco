'use client'
import { usePathname } from 'next/navigation'

/**
 * Fade scurt la fiecare schimbare de rută. Cheia pe pathname repornește
 * animația; conținutul se remontează oricum la navigare.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div key={pathname} className="page-fade">{children}</div>
}
