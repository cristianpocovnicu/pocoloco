'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const NO_SIDEBAR_ROUTES = [
  '/login',
  '/register', 
  '/onboarding',
  '/add-experience',
]

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !NO_SIDEBAR_ROUTES.some(route => pathname.startsWith(route))

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col items-center">
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
