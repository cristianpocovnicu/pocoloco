import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Călătorii — itinerarii reale, zi cu zi | Pocoloco',
  description: 'Itinerarii scrise de oameni care au fost acolo: opriri, zile, transport, poze. Vezi ce merită și ce nu.',
  alternates: { canonical: '/trips' },
  openGraph: {
    title: 'Călătorii pe Pocoloco',
    description: 'Itinerarii reale, zi cu zi, de la călători reali.',
    type: 'website',
    locale: 'ro_RO',
  },
}

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
