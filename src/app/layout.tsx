import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import PageTransition from '@/components/layout/PageTransition'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  // fără metadataBase, imaginile OG relative nu se rezolvă în absolut
  metadataBase: new URL('https://pocoloco.travel'),
  title: {
    default: 'Pocoloco — Experiențe reale de la călători reali',
    template: '%s',
  },
  description: 'Descoperă locuri autentice, citește experiențe reale și împărtășește aventurile tale cu comunitatea Pocoloco.',
  keywords: 'travel, calatorii, experiente, romania, locuri, ghid',
  openGraph: {
    title: 'Pocoloco',
    description: 'Experiențe reale de la călători reali',
    url: 'https://pocoloco.travel',
    siteName: 'Pocoloco',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pocoloco',
    description: 'Experiențe reale de la călători reali',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pocoloco',
  },
}

export const viewport: Viewport = {
  themeColor: '#E8440A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* Zona de continut — se intinde pe tot spatiul ramas si centreaza continutul */}
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div className="w-full">
                <PageTransition>{children}</PageTransition>
                <Footer />
              </div>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
