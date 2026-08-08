/**
 * Constructorii de date structurate.
 *
 * Fișierul nu importă nimic: sunt funcții pure peste date simple. Așa pot
 * fi rulate și verificate în afara aplicației, fără bază și fără Next —
 * altfel singura validare posibilă ar fi cititul cu ochiul.
 *
 * Cheile cu `undefined` dispar la `JSON.stringify`, deci un câmp lipsă nu
 * ajunge niciodată în HTML ca `null`.
 */

export type LdPlace = {
  id: string
  name: string
  description?: string | null
  image?: string | null
  city?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type LdReview = {
  author: string
  datePublished: string
  body: string
  rating: number | null
}

export type LdRating = { value: number; count: number }

export type LdStop = {
  name: string
  /** locurile au pagină proprie; activitățile n-au pin și n-au adresă */
  locationId?: string | null
  city?: string | null
  country?: string | null
}

const address = (city?: string | null, country?: string | null) =>
  city || country
    ? { '@type': 'PostalAddress', addressLocality: city || undefined, addressCountry: country || undefined }
    : undefined

/** Un loc, cu media notelor și primele recenzii. */
export function placeJsonLd(site: string, place: LdPlace, rating: LdRating | null, reviews: LdReview[]) {
  const url = `${site}/location/${place.id}`

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    '@id': `${url}#place`,
    name: place.name,
    url,
    description: place.description?.trim() || undefined,
    image: place.image || undefined,
    address: address(place.city, place.country),
    geo: place.latitude != null && place.longitude != null
      ? { '@type': 'GeoCoordinates', latitude: place.latitude, longitude: place.longitude }
      : undefined,
    // sub două note media n-ar fi o medie, ci părerea unui om îmbrăcată în
    // statistică — atunci lipsește cu totul
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating.value,
          reviewCount: rating.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: reviews.length > 0
      ? reviews.map(review => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: review.author },
          datePublished: review.datePublished,
          reviewBody: review.body,
          reviewRating: review.rating
            ? { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 }
            : undefined,
        }))
      : undefined,
  }
}

/**
 * O călătorie.
 *
 * `TouristTrip` există în schema.org și se mapează exact pe modelul nostru
 * (`itinerary` = ItemList de locuri). Google n-are un rezultat bogat pentru
 * el, deci markup-ul e pentru corectitudine semantică și pentru motoarele
 * care citesc, nu pentru stele în SERP.
 */
export function tripJsonLd(
  site: string,
  trip: { id: string; title: string; description?: string | null; image?: string | null },
  stops: LdStop[]
) {
  const url = `${site}/trip/${trip.id}`

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': `${url}#trip`,
    name: trip.title,
    url,
    description: trip.description?.trim() || undefined,
    image: trip.image || undefined,
    itinerary: stops.length > 0
      ? {
          '@type': 'ItemList',
          numberOfItems: stops.length,
          itemListElement: stops.map((stop, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: stop.locationId
              ? {
                  '@type': 'TouristAttraction',
                  name: stop.name,
                  url: `${site}/location/${stop.locationId}`,
                  address: address(stop.city, stop.country),
                }
              : { '@type': 'Thing', name: stop.name },
          })),
        }
      : undefined,
  }
}

/** Firimiturile, în forma pe care o citește Google. */
export function breadcrumbsJsonLd(site: string, trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: `${site}${step.path}`,
    })),
  }
}

/** Cine suntem — o singură dată, pe tot site-ul. */
export function organizationJsonLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}#organization`,
        name: 'Pocoloco',
        url: site,
        logo: `${site}/icon-512.png`,
        description: 'Experiențe reale de la călători reali.',
      },
      {
        '@type': 'WebSite',
        '@id': `${site}#website`,
        name: 'Pocoloco',
        url: site,
        inLanguage: 'ro-RO',
        publisher: { '@id': `${site}#organization` },
      },
    ],
  }
}
