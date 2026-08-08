import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import { supabase } from '@/lib/supabase'
import { fetchItinerary } from '@/lib/trips'
import { breadcrumbsJsonLd, tripJsonLd } from '@/lib/jsonld'
import { SITE_URL, getTripSeo } from '@/lib/seo'

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const data = await getTripSeo(params.id)
  if (!data) return { title: 'Călătorie — Pocoloco' }

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

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const data = await getTripSeo(params.id)
  if (!data) return <>{children}</>

  // aceeași funcție ca pagina: itinerarul e deja o listă ordonată pe zile
  const stops = await fetchItinerary(supabase, data.id)
  const trip = tripJsonLd(
    SITE_URL,
    { id: data.id, title: data.title, description: data.description, image: data.cover_image },
    stops.map(stop => ({
      name: stop.location?.name || stop.experience?.title || 'Activitate',
      locationId: stop.location?.id || null,
      city: stop.location?.city || null,
      country: stop.location?.country || null,
    })),
  )

  return (
    <>
      <JsonLd data={trip} />
      <JsonLd data={breadcrumbsJsonLd(SITE_URL, [
        { name: 'Acasă', path: '/' },
        { name: 'Călătorii', path: '/trips' },
        { name: data.title, path: `/trip/${data.id}` },
      ])} />
      {children}
    </>
  )
}
