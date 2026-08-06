import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const { data } = await supabase
    .from('trips')
    .select('title, description, cover_image, duration_days, countries, status')
    .eq('id', params.id)
    .maybeSingle()

  if (!data || data.status !== 'active') {
    return { title: 'Călătorie — Pocoloco' }
  }

  const title = `${data.title} | Pocoloco`

  const parts = [
    data.duration_days ? `${data.duration_days} zile` : null,
    data.countries?.length ? data.countries.join(', ') : null,
  ].filter(Boolean).join(' · ')

  const description = (data.description?.trim() ||
    `Itinerar de călătorie${parts ? ` — ${parts}` : ''}. Vezi opririle, zi cu zi, pe Pocoloco.`
  ).slice(0, 160)

  const images = data.cover_image ? [{ url: data.cover_image }] : undefined

  return {
    title,
    description,
    alternates: { canonical: `/trip/${params.id}` },
    openGraph: { title, description, images, type: 'article', locale: 'ro_RO' },
    twitter: { card: 'summary_large_image', title, description, images: data.cover_image ? [data.cover_image] : undefined },
  }
}

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
