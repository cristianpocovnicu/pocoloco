'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from './supabase-client'
import { countRows } from './admin'

/**
 * Câte lucruri așteaptă moderarea, pentru badge-ul din navigație.
 *
 * Două cozi există azi: locațiile propuse de useri (`locations.status =
 * 'pending'`) și raportările de conținut (`reports.status = 'pending'`).
 * Experiențele ascunse de voturi nu sunt o coadă — nu au stare de
 * „rezolvat", se văd oricând din dashboard.
 *
 * Se recitește la montare și la fiecare navigare. **Fără realtime, intenționat:**
 * ar cere adăugarea tabelei `locations` în publicația de replicare din
 * Supabase — o configurare manuală în plus — pentru o coadă care se
 * schimbă de câteva ori pe zi. Când adminul umblă prin site, contorul e
 * proaspăt; când stă pe o pagină, o locație nouă poate aștepta un click.
 *
 * Numărătoarea se face doar pentru admini: RLS n-ar întoarce oricum
 * rândurile altcuiva, dar așa nu plătim nici două cereri degeaba.
 */
export function useModerationQueue(isAdmin: boolean): number {
  const pathname = usePathname()
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!isAdmin) { setTotal(0); return }

    let active = true
    const load = async () => {
      const supabase = createClient()
      const [locations, reports] = await Promise.all([
        countRows(supabase, 'locations', q => q.eq('status', 'pending')),
        countRows(supabase, 'reports', q => q.eq('status', 'pending')),
      ])
      if (active) setTotal(locations + reports)
    }

    load()
    return () => { active = false }
  }, [isAdmin, pathname])

  return total
}
