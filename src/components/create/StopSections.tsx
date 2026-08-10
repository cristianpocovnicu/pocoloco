'use client'
import { useRef, useState } from 'react'
import { CalendarDays, Camera, ChevronDown, Loader2, Plus, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import StoryTextarea from '@/components/ui/StoryTextarea'
import { ratingLabels, ratingScales } from '@/lib/activities'
import { MONTHS_RO, currentYear, selectableYears } from '@/lib/period'
import type { StopDraft } from '@/lib/story'

/**
 * Ponturile rapide — set interimar, august 2026.
 *
 * Cel dinainte amesteca două lucruri care n-au ce căuta împreună: fapte
 * verificabile („Parcare ușoară") și evaluări deghizate în fapte („Merită
 * prețul", „Peisaj spectaculos") — părerea are deja unde să stea, în text
 * și în stele.
 *
 * Toate cele de mai jos răspund la „ce trebuie să știu înainte să plec",
 * nu la „cât de frumos a fost". Setul final se extrage din ponturile care
 * se repetă în textele oamenilor, după seed — vezi §5 din context-produs.
 */
const TIPS_OPTIONS = [
  'Mergi dimineața', 'Evită weekendul', 'Rezervă din timp',
  'Parcare ușoară', 'Ajungi ușor fără mașină', 'Bun cu copii',
  'Acces fără trepte', 'Gratuit', 'Mergi la apus',
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
      <button type="button"
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

/**
 * Luna și anul vizitei. Amândouă opționale, dar luna n-are sens singură:
 * alegerea unei luni completează automat anul curent, iar ștergerea
 * anului scoate și luna.
 */
export function PeriodPicker({
  year,
  month,
  onChange,
}: {
  year: number | null
  month: number | null
  onChange: (patch: { visitedYear: number | null; visitedMonth: number | null }) => void
}) {
  const years = selectableYears()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[12px] text-[#6B6B6B] flex items-center gap-1.5">
        <CalendarDays size={13} className="text-[#9B9B9B]" />
        Când ai fost? <span className="text-[#9B9B9B]">(opțional)</span>
      </span>

      <div className="flex items-center gap-1.5 ml-auto">
        <select
          value={month ?? ''}
          onChange={e => {
            const value = e.target.value ? Number(e.target.value) : null
            onChange({ visitedMonth: value, visitedYear: value && !year ? currentYear() : year })
          }}
          aria-label="Luna"
          className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1.5 text-[12px] text-[#0F0F0F] outline-none focus:border-[#E8440A] transition-colors"
        >
          <option value="">luna</option>
          {MONTHS_RO.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>

        <select
          value={year ?? ''}
          onChange={e => {
            const value = e.target.value ? Number(e.target.value) : null
            onChange({ visitedYear: value, visitedMonth: value ? month : null })
          }}
          aria-label="Anul"
          className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1.5 text-[12px] text-[#0F0F0F] outline-none focus:border-[#E8440A] transition-colors"
        >
          <option value="">anul</option>
          {years.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
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
      setError('Maxim 5 poze aici.')
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

  /**
   * Scoaterea unei poze din listă.
   *
   * Confirmăm doar la ultima: o experiență fără poze e legitimă, dar
   * „rămâne fără nicio poză" e o schimbare de altă natură decât „mai scot
   * una din patru". Fișierul rămâne în bucket, ca peste tot — curățenia
   * lui e o treabă separată.
   */
  const remove = (index: number) => {
    if (images.length === 1 && !window.confirm('Scoți și ultima poză? Experiența rămâne fără imagini.')) return
    onChange(images.filter((_, idx) => idx !== index))
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={add} />
      <div className="flex flex-wrap gap-2.5">
        {images.map((url, i) => (
          <div key={url} className="relative w-[calc(33%-7px)] aspect-square rounded-xl overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />

            <button type="button"
              onClick={() => remove(i)}
              aria-label="Scoate poza"
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
            >
              <X size={12} className="text-white" />
            </button>

            {/* prima poză e coperta: în feed apare mare, iar călătoria își
                ia auto-coperta de la ea. De aceea se poate schimba. */}
            {i === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 text-[9px] font-outfit font-bold uppercase tracking-wide bg-black/55 text-white px-1.5 py-0.5 rounded-full">
                Prima
              </span>
            ) : (
              <button type="button"
                onClick={() => onChange([url, ...images.filter((_, idx) => idx !== i)])}
                className="absolute bottom-1.5 left-1.5 text-[9px] font-outfit font-semibold bg-black/55 text-white px-1.5 py-0.5 rounded-full"
              >
                Fă-o prima
              </button>
            )}
          </div>
        ))}

        {images.length < 5 && (
          <button type="button"
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

function Stars({
  value,
  onChange,
  label,
  legend,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  /** ce înseamnă fiecare stea, de la 1 la 5 */
  legend: string[]
}) {
  const [hover, setHover] = useState(0)
  // ce se arată: steaua peste care e degetul, altfel cea aleasă
  const shown = hover || value

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#6B6B6B]">{label}</span>
        <div className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(i => (
            <button type="button"
              key={i}
              onClick={() => onChange(i === value ? 0 : i)}
              onMouseEnter={() => setHover(i)}
              aria-label={`${label}: ${i} — ${legend[i - 1]}`}
              title={legend[i - 1]}
            >
              <Star size={22} className={i <= shown ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
            </button>
          ))}
        </div>
      </div>
      {shown > 0 && (
        <p className="text-[11px] text-[#9B9B9B] text-right mt-0.5">{legend[shown - 1]}</p>
      )}
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
  const scales = ratingScales(stop.kind)
  return (
    <div>
      <p className="text-[11px] text-[#9B9B9B] mb-1">Notează ce ai trăit, nu ce ai așteptat.</p>
      <Stars value={stop.ratingExperience} onChange={v => onChange({ ratingExperience: v })} label={labels.experience} legend={scales.experience} />
      <Stars value={stop.ratingAccess} onChange={v => onChange({ ratingAccess: v })} label={labels.access} legend={scales.access} />
      <Stars value={stop.ratingCrowd} onChange={v => onChange({ ratingCrowd: v })} label={labels.crowd} legend={scales.crowd} />
    </div>
  )
}

export function StoryEditor({
  stop,
  onChange,
  title,
}: {
  stop: StopDraft
  onChange: (patch: Partial<StopDraft>) => void
  /** ce scrie în capul modului concentrat — aceeași întrebare ca pe secțiune */
  title: string
}) {
  const toggleTip = (tip: string) =>
    onChange({ tips: stop.tips.includes(tip) ? stop.tips.filter(t => t !== tip) : [...stop.tips, tip] })

  return (
    <div>
      <div className="mb-3">
        <StoryTextarea
          value={stop.content}
          onChange={content => onChange({ content })}
          title={title}
          tone="muted"
          placeholder="Ce ai văzut, ce ai mâncat, ce ai fi vrut să știi dinainte — despre locul ăsta."
        />
      </div>

      <div className="text-[12px] font-medium text-[#6B6B6B] mb-2">Ponturi rapide — opțional</div>
      <div className="flex flex-wrap gap-1.5">
        {TIPS_OPTIONS.map(tip => (
          <button type="button"
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
