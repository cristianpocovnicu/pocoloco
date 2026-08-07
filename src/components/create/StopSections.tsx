'use client'
import { useRef, useState } from 'react'
import { Camera, ChevronDown, Loader2, Plus, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import CharCounter from '@/components/ui/CharCounter'
import { ratingLabels } from '@/lib/activities'
import type { StopDraft } from '@/lib/story'

const TIPS_OPTIONS = [
  'Merită prețul', 'Bun pentru familie', 'Parcare ușoară',
  'Aglomerat weekend', 'Mergi dimineața', 'Rezervă online',
  'Accesibil cu copii', 'Gratuit', 'Peisaj spectaculos',
]

/**
 * Două feluri de secțiune:
 *
 *   - deschisă mereu (`alwaysOpen`), la primul loc: editorul e acolo de
 *     la încărcare, cu „(opțional)" lângă titlu ca să se vadă că nu e
 *     nimic de bifat înainte de publicare;
 *   - un rând care se deschide la click, pentru locurile următoare, unde
 *     de obicei n-ai de scris decât o notă.
 */
export function Section({
  label,
  hint,
  summary,
  open,
  onToggle,
  children,
  alwaysOpen,
}: {
  label: string
  hint?: string
  /** ce s-a completat, arătat când rândul e strâns */
  summary?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  /** fără strângere: editorul stă deschis */
  alwaysOpen?: boolean
}) {
  const filled = !!summary

  if (alwaysOpen) return (
    <div className="border-t border-[rgba(0,0,0,0.06)] pt-3.5 mt-3.5">
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-[13px] font-medium text-[#0F0F0F]">{label}</span>
        <span className="text-[11px] text-[#9B9B9B]">(opțional)</span>
      </div>
      {children}
    </div>
  )

  return (
    <div className="border-t border-[rgba(0,0,0,0.06)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 py-3 text-left"
      >
        {open ? (
          <ChevronDown size={15} className="text-[#9B9B9B] flex-shrink-0" />
        ) : (
          <Plus size={15} className={filled ? 'text-[#059669] flex-shrink-0' : 'text-[#E8440A] flex-shrink-0'} />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-[#0F0F0F]">{label}</span>
          {!open && summary && <div className="text-[12px] text-[#6B6B6B] truncate">{summary}</div>}
          {!open && !summary && hint && <div className="text-[11px] text-[#9B9B9B] truncate">{hint}</div>}
        </div>
        {!open && filled && <span className="text-[12px] text-[#5B4FCF] font-medium flex-shrink-0">Modifică</span>}
      </button>

      {open && <div className="pb-3">{children}</div>}
    </div>
  )
}

/** Pozele se urcă imediat: altfel n-ar supraviețui într-o poveste salvată. */
export function PhotoEditor({
  images,
  onChange,
}: {
  images: string[]
  onChange: (images: string[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (images.length + files.length > 5) {
      setError('Maxim 5 poze pentru o oprire.')
      return
    }

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const added: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `experiences/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('images').upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('images').getPublicUrl(path)
        added.push(data.publicUrl)
      }
    }

    if (added.length === 0) setError('Pozele n-au putut fi urcate. Încearcă din nou.')
    onChange([...images, ...added])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={add} />
      <div className="flex flex-wrap gap-2.5">
        {images.map((url, i) => (
          <div key={url} className="relative w-[calc(33%-7px)] aspect-square rounded-xl overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label="Scoate poza"
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ))}

        {images.length < 5 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-[calc(33%-7px)] aspect-square rounded-xl border-2 border-dashed border-[rgba(232,68,10,0.3)] bg-[#FFF0EB] flex flex-col items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {uploading
              ? <Loader2 size={20} className="animate-spin text-[#E8440A]" />
              : <Camera size={20} className="text-[#E8440A]" />}
            <span className="text-[11px] text-[#E8440A] font-medium">{uploading ? 'Se urcă' : 'Adaugă'}</span>
          </button>
        )}
      </div>

      {error && <p className="text-[12px] text-[#DC2626] mt-2">{error}</p>}
    </div>
  )
}

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-[#6B6B6B]">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i === value ? 0 : i)} aria-label={`${label}: ${i}`}>
            <Star size={22} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function RatingEditor({
  stop,
  onChange,
}: {
  stop: StopDraft
  onChange: (patch: Partial<StopDraft>) => void
}) {
  const labels = ratingLabels(stop.kind)
  return (
    <div>
      <Stars value={stop.ratingExperience} onChange={v => onChange({ ratingExperience: v })} label={labels.experience} />
      <Stars value={stop.ratingAccess} onChange={v => onChange({ ratingAccess: v })} label={labels.access} />
      <Stars value={stop.ratingCrowd} onChange={v => onChange({ ratingCrowd: v })} label={labels.crowd} />
    </div>
  )
}

export function StoryEditor({
  stop,
  onChange,
}: {
  stop: StopDraft
  onChange: (patch: Partial<StopDraft>) => void
}) {
  const toggleTip = (tip: string) =>
    onChange({ tips: stop.tips.includes(tip) ? stop.tips.filter(t => t !== tip) : [...stop.tips, tip] })

  return (
    <div>
      <textarea
        value={stop.content}
        onChange={e => onChange({ content: e.target.value.slice(0, 20000) })}
        rows={5}
        placeholder="Cum a fost? Ce ai face altfel a doua oară?"
        className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed"
      />
      <div className="mb-3">
        <CharCounter value={stop.content} max={20000} />
      </div>

      <div className="text-[12px] font-medium text-[#6B6B6B] mb-2">Ponturi rapide — opțional</div>
      <div className="flex flex-wrap gap-1.5">
        {TIPS_OPTIONS.map(tip => (
          <button
            key={tip}
            onClick={() => toggleTip(tip)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              stop.tips.includes(tip)
                ? 'bg-[#FFF0EB] text-[#E8440A] border-[rgba(232,68,10,0.25)]'
                : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
            }`}
          >
            {stop.tips.includes(tip) && '✓ '}{tip}
          </button>
        ))}
      </div>
    </div>
  )
}
