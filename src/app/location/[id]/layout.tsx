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
 * Metadata și datele structurate ale unui loc.
 *
 * Pagina e server component de la tranșa B; aici rămân titlul, descrierea
 * și JSON-LD-ul, cu aceleași loadere cache-uite pe cerere ca pagina — deci
 * baza nu e întrebată de două ori. Citim cu clientul anon: o locație
 * neaprobată nu se întoarce, deci nu scapă nici în share, nici în index.
 */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const data = await getLocationSeo(params.id)
  if (!data) return { title: 'Locație — Pocoloco' }

  const place = [data.city, data.country].filter(Boolean).join(', ')
  const title = `${data.name}${place ? ` — ${place}` : ''} | Pocoloco`

  /*
   * Descrierea vine din conținut real: începutul celei mai bine votate
   * experiențe. Un rând scris de om spune mai mult în rezultate decât o
   * numărătoare — iar când nu există nicio experiență nu anunțăm golul,
   * ci invităm.
   */
  const reviews = await getLocationReviews(params.id)
  const lead = reviews.find(review => review.content?.trim())

  const description = (
    data.description?.trim() ||
    (lead ? excerpt(lead.content, 150) : '') ||
    // fără număr: „0 experiențe" anunță golul în loc să cheme pe cineva
    // în el. Numărul e oricum nesigur — vezi migrarea 41.
    `Descoperă ${data.name}${place ? ` din ${place}` : ''} — adaugă prima poveste.`
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
