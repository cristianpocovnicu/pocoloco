'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Footer from './Footer'
import PageTransition from './PageTransition'

/**
 * Structura pe desktop, ca la Instagram:
 *
 *   [ gol ][ sidebar 220px | conținut ][ gol ]
 *            \___ blocul centrat, max 1100px ___/
 *
 * Wrapperul exterior ține fundalul pe toată lățimea ecranului, iar cel
 * interior centrează blocul. Pe mobil sidebar-ul e ascuns (hidden md:flex),
 * deci rămâne doar conținutul, pe toată lățimea, cu bara de jos.
 *
 * Zona de admin are propriul layout, pe toată lățimea — o lăsăm în pace.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <div className="min-h-screen w-full bg-[#F0EDE8]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1100px]">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <PageTransition>{children}</PageTransition>
          <Footer />
        </div>
      </div>
    </div>
  )
}
