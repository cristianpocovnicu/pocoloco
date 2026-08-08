import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbsJsonLd, placeJsonLd } from '@/lib/jsonld'
import {
  SITE_URL,
  averageRating,
  excerpt,
  getLocationReviews,
  getLocationSeo,
} from '@/lib/seo'

/**
 * Pagina locației e client component (voturi, comentarii), deci metadata
 * dinamică și datele structurate stau aici, în layout-ul rutei. Citim cu
 * clientul anon: dacă locația nu e aprobată, RLS nu o întoarce și nu
 * scăpăm nimic în share.
 */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const data = await getLocationSeo(params.id)
  if (!data) return { title: 'Locație — Pocoloco' }

  const place = [data.city, data.country].filter(Boolean).join(', ')
  const title = `${data.name}${place ? ` — ${place}` : ''} | Pocoloco`

  const description = (data.description?.trim() ||
    `${data.experience_count || 0} experiențe reale despre ${data.name}${place ? ` din ${place}` : ''}. ` +
    'Citește ce au trăit alți călători înainte să pleci la drum.'
  ).slice(0, 160)

  const images = data.cover_image ? [{ url: data.cover_image }] : undefined

  return {
    title,
    description,
    alternates: { canonical: `/location/${params.id}` },
    openGraph: { title, description, images, type: 'article', locale: 'ro_RO' },
    twitter: { card: 'summary_large_image', title, description, images: data.cover_image ? [data.cover_image] : undefined },
  }
}

export default async function LocationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const data = await getLocationSeo(params.id)
  if (!data) return <>{children}</>

  const reviews = await getLocationReviews(data.id)
  const rating = averageRating(reviews.map(review => review.rating_experience))

  const place = placeJsonLd(
    SITE_URL,
    {
      id: data.id,
      name: data.name,
      description: data.description,
      image: data.cover_image,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    rating,
    reviews
      .filter(review => review.content?.trim())
      .slice(0, 5)
      .map(review => ({
        author: review.author?.full_name || review.author?.username || 'Călător',
        datePublished: review.created_at,
        body: excerpt(review.content, 400),
        rating: review.rating_experience,
      })),
  )

  return (
    <>
      <JsonLd data={place} />
      <JsonLd data={breadcrumbsJsonLd(SITE_URL, [
        { name: 'Acasă', path: '/' },
        { name: data.name, path: `/location/${data.id}` },
      ])} />
      {children}
    </>
  )
}
