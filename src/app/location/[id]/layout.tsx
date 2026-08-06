import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

/**
 * Pagina locației e client component (voturi, comentarii), deci metadata
 * dinamică stă aici, în layout-ul rutei. Citim cu clientul anon: dacă
 * locația nu e aprobată, RLS nu o întoarce și nu scăpăm nimic în share.
 */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const { data } = await supabase
    .from('locations')
    .select('name, city, country, description, cover_image, experience_count, score, status')
    .eq('id', params.id)
    .maybeSingle()

  if (!data || data.status !== 'approved') {
    return { title: 'Locație — Pocoloco' }
  }

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

export default function LocationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
