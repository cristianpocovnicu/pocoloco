'use client'
import { useEffect, useState } from 'react'
import { Loader2, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import CharCounter from '@/components/ui/CharCounter'
import { useToast } from '@/components/ui/Toast'

export type EditableExperience = {
  id: string
  content: string
  rating_experience: number | null
  rating_access: number | null
  rating_crowd: number | null
}

type Props = {
  experience: EditableExperience
  onClose: () => void
  onSaved: (updated: EditableExperience) => void
}

function StarRow({ label, value, onChange, required }: {
  label: string
  value: number
  onChange: (v: number) => void
  required?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[rgba(0,0,0,0.06)] last:border-0">
      <div>
        <div className="text-[13px] font-medium text-[#0F0F0F]">{label}</div>
        <div className="text-[11px] text-[#9B9B9B]">{required ? 'Obligatoriu' : 'Opțional'}</div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i === value ? 0 : i)} aria-label={`${label}: ${i} stele`}>
            <Star size={22} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ExperienceEditModal({ experience, onClose, onSaved }: Props) {
  const [content, setContent] = useState(experience.content || '')
  const [ratingExp, setRatingExp] = useState(experience.rating_experience || 0)
  const [ratingAccess, setRatingAccess] = useState(experience.rating_access || 0)
  const [ratingCrowd, setRatingCrowd] = useState(experience.rating_crowd || 0)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  // Escape închide, iar fundalul nu mai derulează sub modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const handleSave = async () => {
    if (content.trim().length < 20) {
      setError('Textul trebuie să aibă minim 20 de caractere.')
      return
    }
    setSaving(true)
    setError(null)

    const patch = {
      content: content.trim(),
      // notarea e opțională peste tot; 0 în ecran înseamnă NULL în bază
      rating_experience: ratingExp || null,
      rating_access: ratingAccess || null,
      rating_crowd: ratingCrowd || null,
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('experiences')
      .update(patch)
      .eq('id', experience.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    toast('Experiență actualizată')
    onSaved({ ...experience, ...patch })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editează experiența"
        className="relative bg-white w-full md:max-w-[560px] rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Editează experiența</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center" aria-label="Închide">
            <X size={16} className="text-[#6B6B6B]" />
          </button>
        </div>

        <div className="px-5 py-4">
          {error && (
            <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4">
              <p className="text-[13px] text-[#DC2626]">{error}</p>
            </div>
          )}

          <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Povestea ta</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 20000))}
            rows={6}
            className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors resize-none leading-relaxed"
          />
          <div className="mb-4">
            <CharCounter value={content} max={20000} min={20} />
          </div>

          <div className="bg-[#F8F7F5] rounded-2xl border border-[rgba(0,0,0,0.08)] px-4 py-1 mb-5">
            <StarRow label="Experiență generală" value={ratingExp} onChange={setRatingExp} required />
            <StarRow label="Acces și organizare" value={ratingAccess} onChange={setRatingAccess} />
            <StarRow label="Aglomerație și așteptare" value={ratingCrowd} onChange={setRatingCrowd} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[14px] font-medium py-3 rounded-full"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#E8440A] text-white font-outfit text-[14px] font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Se salvează...</> : 'Salvează'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
