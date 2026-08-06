'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Footer from './Footer'
import PageTransition from './PageTransition'

/**
 * Sidebar + conținut, ca un singur bloc centrat pe ecran: 220px de navigație
 * plus coloana de conținut, plafonate la 1000px. Pe ecrane mari spațiul rămâne
 * gol simetric, în loc să lase totul lipit de marginea stângă. Pe mobil
 * sidebar-ul e ascuns, deci blocul e pur și simplu lățimea ecranului.
 *
 * Zona de admin are propriul layout, pe toată lățimea — nu o îngrădim aici.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <div className="mx-auto flex w-full max-w-[1000px] min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <PageTransition>{children}</PageTransition>
        <Footer />
      </div>
    </div>
  )
}
