'use client'
import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { CATEGORIES } from '@/lib/utils'

export type EditableLocation = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  locality?: string | null
  admin_area_1?: string | null
  admin_area_2?: string | null
  country_code?: string | null
}

type Props = {
  location: EditableLocation
  /** false când migrarea 37 nu e rulată: atunci câmpurile de regiune lipsesc */
  geoSupported: boolean
  onClose: () => void
  onSaved: (updated: EditableLocation) => void
}

/**
 * Corectarea manuală a unui loc.
 *
 * Lipsesc intenționat coordonatele și `google_place_id`: alea vin din
 * geocodare și se repară cu butoanele de backfill. Scrise de mână, ar
 * strica exact lanțul care aduce poza și regiunea.
 *
 * Scrie doar un admin — politica `admins_update_locations` (migrarea 1) îi
 * dă voie pe orice rând, iar `locations_protect_status` (migrarea 2) lasă
 * statusul neatins pentru toți ceilalți.
 */
export default function LocationEditModal({ location, geoSupported, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EditableLocation>(location)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<EditableLocation>) => setForm(prev => ({ ...prev, ...patch }))

  const clean = (value: string | null | undefined) => {
    const trimmed = (value || '').trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const save = async () => {
    if (!clean(form.name)) { setError('Numele nu poate rămâne gol.'); return }

    setSaving(true)
    setError(null)

    const patch: Record<string, string | null> = {
      name: clean(form.name),
      city: clean(form.city),
      country: clean(form.country),
      category: clean(form.category),
    }

    if (geoSupported) {
      patch.locality = clean(form.locality)
      patch.admin_area_1 = clean(form.admin_area_1)
      patch.admin_area_2 = clean(form.admin_area_2)
      // codul de țară e ISO: două litere, mari
      patch.country_code = clean(form.country_code)?.toUpperCase().slice(0, 2) || null
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.from('locations').update(patch).eq('id', form.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    onSaved({ ...form, ...patch } as EditableLocation)
  }

  const field = (
    label: string,
    key: keyof EditableLocation,
    placeholder?: string,
    hint?: string,
  ) => (
    <div>
      <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1">{label}</label>
      <input
        value={(form[key] as string) || ''}
        onChange={e => set({ [key]: e.target.value } as Partial<EditableLocation>)}
        placeholder={placeholder}
        className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
      />
      {hint && <p className="text-[11px] text-[#9B9B9B] mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="bg-white w-full md:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between">
          <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Editează locația</span>
          <button onClick={onClose} aria-label="Închide" className="w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center">
            <X size={15} className="text-[#6B6B6B]" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5">
          {field('Nume', 'name', 'Cascada Bigăr')}

          <div className="grid grid-cols-2 gap-3">
            {field('Oraș (afișat)', 'city', 'Bozovici')}
            {field('Țară (afișată)', 'country', 'România')}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1">Categorie</label>
            <select
              value={form.category || ''}
              onChange={e => set({ category: e.target.value || null })}
              className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#E8440A] transition-colors"
            >
              <option value="">Fără categorie</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {geoSupported && (
            <>
              <div className="border-t border-[rgba(0,0,0,0.06)] pt-3.5">
                <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F]">Geografie</p>
                <p className="text-[11px] text-[#9B9B9B]">
                  Se completează din Google cu butonul „Regiune&rdquo;. Corectează manual doar ce a nimerit greșit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Localitate', 'locality', 'Bozovici')}
                {field('Cod țară', 'country_code', 'RO', 'Două litere, ISO')}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Regiune (nivel 1)', 'admin_area_1', 'Caraș-Severin')}
                {field('Nivel 2', 'admin_area_2', 'Bozovici')}
              </div>
            </>
          )}

          {error && (
            <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-3.5 py-2.5">
              <p className="text-[12px] text-[#DC2626]">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-[#9B9B9B]">
            Coordonatele și place id-ul nu se editează aici: vin din geocodare, iar o valoare scrisă de
            mână ar rupe lanțul care aduce poza și regiunea.
          </p>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[rgba(0,0,0,0.08)] px-5 py-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-[#E8440A] text-white font-outfit text-[14px] font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Salvează
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-[13px] text-[#6B6B6B] font-medium px-4 disabled:opacity-50"
          >
            Renunță
          </button>
        </div>
      </div>
    </div>
  )
}
