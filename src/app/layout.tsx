import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import AppShell from '@/components/layout/AppShell'
import { Suspense } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthGateProvider } from '@/components/auth/AuthGate'

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
  // fără maximumScale: blocarea zoom-ului e o problemă de accesibilitate.
  // Zoom-ul automat la focus pe iOS e ținut în frâu din CSS, cu 16px pe
  // câmpuri la ecranele tactile — vezi styles/globals.css.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <ToastProvider>
          <Suspense fallback={null}>
            <AuthGateProvider>
              <AppShell>{children}</AppShell>
            </AuthGateProvider>
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  )
}
