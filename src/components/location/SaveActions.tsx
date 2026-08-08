'use client'
import { useEffect, useState } from 'react'
import { Bookmark, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'
import { useAuthGate } from '@/components/auth/AuthGate'
import { getLocationSaveStatus, setLocationSaveStatus, type SaveStatus } from '@/lib/saves'
import VisitPrompt from './VisitPrompt'

/**
 * „Vreau să merg" / „Am fost".
 *
 * Starea ține de cine se uită, deci nu poate veni de pe server: pagina se
 * randează la fel pentru toți și se cachează, iar butoanele își află starea
 * după hidratare. Până atunci arată neapăsate — ceea ce e adevărat pentru
 * orice vizitator nou.
 */
export default function SaveActions({
  locationId,
  locationName,
}: {
  locationId: string
  locationName: string
}) {
  const toast = useToast()
  const gate = useAuthGate()
  const [status, setStatus] = useState<SaveStatus | null>(null)
  const [pending, setPending] = useState(false)
  const [showVisitPrompt, setShowVisitPrompt] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const saved = await getLocationSaveStatus(supabase, user.id, locationId)
      if (active) setStatus(saved)
    }
    load()
    return () => { active = false }
  }, [locationId])

  /**
   * Cele două liste sunt exclusive: apeși pe una activă → o scoate, apeși pe
   * cealaltă → mută locația acolo. Un singur rând în `saves`, oricum.
   */
  const change = async (next: SaveStatus) => {
    if (pending) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { gate('Ține minte locurile unde vrei să ajungi și pe cele unde ai fost.'); return }

    const target = status === next ? null : next
    const previous = status

    setPending(true)
    setStatus(target)

    const error = await setLocationSaveStatus(supabase, user.id, locationId, target)
    if (error) {
      setStatus(previous)
      toast('Nu am putut salva. Încearcă din nou.', 'error')
    } else if (target === 'visited') {
      // momentul cu amintirea proaspătă — aici se scriu experiențele
      setShowVisitPrompt(true)
    } else if (target === 'want_to_go') {
      toast('Salvat în profilul tău · Salvate')
    } else {
      toast('Scos din listă')
    }

    setPending(false)
  }

  return (
    <>
      <button
        onClick={() => change('want_to_go')}
        disabled={pending}
        className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
          status === 'want_to_go'
            ? 'bg-[#FFF0EB] text-[#E8440A] border border-[rgba(232,68,10,0.2)]'
            : 'bg-[#E8440A] text-white'
        }`}
      >
        <Bookmark size={15} fill={status === 'want_to_go' ? '#E8440A' : 'none'} />
        {status === 'want_to_go' ? 'Salvat' : 'Vreau să merg'}
      </button>

      <button
        onClick={() => change('visited')}
        disabled={pending}
        className={`flex-1 font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
          status === 'visited'
            ? 'bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.2)]'
            : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B]'
        }`}
      >
        <CheckCircle size={15} fill={status === 'visited' ? '#059669' : 'none'} className={status === 'visited' ? 'text-white' : ''} />
        Am fost
      </button>

      {showVisitPrompt && (
        <VisitPrompt
          locationId={locationId}
          locationName={locationName}
          onClose={() => setShowVisitPrompt(false)}
        />
      )}
    </>
  )
}
