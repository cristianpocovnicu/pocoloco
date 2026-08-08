'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

/**
 * „În aprobare", lângă numele unui loc.
 *
 * Se arată doar celui care are dreptul să vadă locul neaprobat — autorul
 * și adminii. Verificarea o face RLS: dacă `locations` întoarce rândul cu
 * `status = 'pending'`, omul are voie să știe. Pentru oricine altcineva
 * query-ul vine gol și chip-ul nu apare niciodată.
 *
 * E client pentru că depinde de cine se uită. Nu apare în HTML-ul servit,
 * deci nu atinge nici cache-ul, nici ce vede un crawler.
 */
export default function PendingChip({
  locationId,
  className = '',
}: {
  locationId: string | null | undefined
  className?: string
}) {
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) return
    let active = true

    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data } = await supabase
        .from('locations')
        .select('status')
        .eq('id', locationId)
        .maybeSingle()

      if (active && data) setStatus((data as { status: string }).status)
    }

    check()
    return () => { active = false }
  }, [locationId])

  if (status !== 'pending' && status !== 'rejected') return null

  return (
    <span
      className={`text-[10px] font-outfit font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
        status === 'rejected' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FFFBEB] text-[#D97706]'
      } ${className}`}
    >
      {status === 'rejected' ? 'respins' : 'în aprobare'}
    </span>
  )
}
