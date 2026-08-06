import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

export async function generateMetadata(
  { params }: { params: { username: string } }
): Promise<Metadata> {
  const { data } = await supabase
    .from('profiles')
    .select('username, full_name, bio, avatar_url, is_guide')
    .eq('username', params.username)
    .maybeSingle()

  if (!data) {
    return { title: 'Profil — Pocoloco' }
  }

  const name = data.full_name || data.username
  const title = `${name} (@${data.username}) | Pocoloco`

  const description = (data.bio?.trim() ||
    `${name} împarte experiențe de călătorie pe Pocoloco${data.is_guide ? ', ca ghid al comunității' : ''}.`
  ).slice(0, 160)

  const images = data.avatar_url ? [{ url: data.avatar_url }] : undefined

  return {
    title,
    description,
    alternates: { canonical: `/profile/${data.username}` },
    openGraph: { title, description, images, type: 'profile', locale: 'ro_RO' },
    twitter: { card: 'summary', title, description, images: data.avatar_url ? [data.avatar_url] : undefined },
  }
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
