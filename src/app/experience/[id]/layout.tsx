import type { Metadata } from 'next'
import { excerpt, getExperienceSeo, isIndexable, noIndex } from '@/lib/seo'

/**
 * Titlul și descrierea unei experiențe.
 *
 * Pagina e server component de la tranșa B, dar metadata rămâne aici: tot
 * layout-ul e locul unde Next o citește, iar loaderul e același, cache-uit
 * pe cerere — deci pagina și metadata nu întreabă baza de două ori.
 */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const data = await getExperienceSeo(params.id)
  if (!data) return { title: 'Experiență — Pocoloco' }

  const subject = data.kind === 'activity'
    ? (data.title || 'Activitate')
    : (data.location?.name || 'Un loc')

  const place = data.kind === 'activity'
    ? data.activity_area
    : [data.location?.city, data.location?.country].filter(Boolean).join(', ')

  const author = data.author?.full_name || data.author?.username
  const title = `${subject}${place ? `, ${place}` : ''} — o experiență${author ? ` de la ${author}` : ''} | Pocoloco`

  const description = excerpt(data.content) ||
    `Ce a trăit cineva la ${subject}${place ? ` din ${place}` : ''}, povestit pe Pocoloco.`

  const cover = data.images?.[0]

  return {
    title,
    description,
    // locul din spate încă nu e public: pagina se citește, dar nu se indexează
    ...(isIndexable(data) ? {} : noIndex),
    alternates: { canonical: `/experience/${params.id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'ro_RO',
      images: cover ? [{ url: cover }] : undefined,
      publishedTime: data.created_at,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  }
}

export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
