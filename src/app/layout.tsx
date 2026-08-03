import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Pocoloco — Experiențe reale de la călători reali',
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
        <div className="mobile-container">
          {children}
        </div>
      </body>
    </html>
  )
}
