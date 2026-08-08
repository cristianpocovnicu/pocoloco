'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * Nu randează nimic: doar întreabă, din browser, dacă cel care se uită are
 * voie să vadă locul neaprobat.
 *
 * RLS decide, nu noi — `locations_select_visible` (migrarea 2) întoarce
 * rândul doar autorului și adminilor. Dacă vine ceva înapoi, ducem omul pe
 * ruta de previzualizare, care citește cookie-urile pe server.
 *
 * De ce așa și nu o verificare pe server: pagina publică e cache-uită, iar
 * o citire de sesiune ar face-o dinamică pentru toată lumea.
 */
export default function PendingRedirect({ locationId }: { locationId: string }) {
  const router = useRouter()

  useEffect(() => {
    let active = true

    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data } = await supabase
        .from('locations')
        .select('id')
        .eq('id', locationId)
        .maybeSingle()

      if (data && active) router.replace(`/location/${locationId}/preview`)
    }

    check()
    return () => { active = false }
  }, [locationId, router])

  return null
}
