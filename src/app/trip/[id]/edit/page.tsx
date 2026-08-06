'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowDown, ArrowUp, Camera, Loader2, MapPin, Plus, Search, Trash2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchItinerary, type Trip } from '@/lib/trips'
import { TRANSPORT_TYPES } from '@/lib/utils'

type FoundLocation = { id: string; name: string; city: string | null }

type Row = {
  /** id-ul rândului din trip_locations; lipsește la opririle nou adăugate */
  rowId?: string
  key: string
  locationId: string
  name: string
  city: string | null
  day: number
  note: string
}

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [transportType, setTransportType] = useState('car')
  const [countries, setCountries] = useState<string[]>([])
  const [countryDraft, setCountryDraft] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [rows, setRows] = useState<Row[]>([])
  const [initialRowIds, setInitialRowIds] = useState<string[]>([])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoundLocation[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('trips').select('*').eq('id', id).maybeSingle()

      if (!data) { setNotFound(true); setLoading(false); return }
      const trip = data as Trip

      const { data: { user } } = await supabase.auth.getUser()
      let canEdit = !!user && user.id === trip.author_id
      if (user && !canEdit) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        canEdit = prof?.role === 'admin'
      }
      setAllowed(canEdit)

      if (canEdit) {
        setTitle(trip.title)
        setDescription(trip.description || '')
        setDurationDays(trip.duration_days || 1)
        setTransportType(trip.transport_type || 'car')
        setCountries(trip.countries || [])
        setCoverUrl(trip.cover_image)

        const itinerary = await fetchItinerary(supabase, trip.id)
        setRows(itinerary.map(item => ({
          rowId: item.id,
          key: item.id,
          locationId: item.location?.id || '',
          name: item.location?.name || 'Locație ștearsă',
          city: item.location?.city || null,
          day: item.day,
          note: item.note || '',
        })))
        setInitialRowIds(itinerary.map(item => item.id))
      }

      setLoading(false)
    }
    load()
  }, [id])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('locations')
      .select('id, name, city')
      .eq('status', 'approved')
      .ilike('name', `%${q.trim()}%`)
      .order('experience_count', { ascending: false })
      .limit(8)
    setResults((data || []) as FoundLocation[])
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const addLocation = (loc: FoundLocation) => {
    setRows(prev => [...prev, {
      key: `new-${loc.id}-${prev.length}`,
      locationId: loc.id,
      name: loc.name,
      city: loc.city,
      day: Math.min(prev.length > 0 ? Math.max(...prev.map(r => r.day)) : 1, durationDays),
      note: '',
    }])
    setQuery('')
    setResults([])
  }

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) => setRows(prev => prev.filter(r => r.key !== key))

  /** Ordinea din listă dă poziția în cadrul zilei, deci mutarea sus/jos e suficientă. */
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    setRows(prev => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const addCountry = () => {
    const value = countryDraft.trim()
    if (!value || countries.includes(value)) { setCountryDraft(''); return }
    setCountries(prev => [...prev, value])
    setCountryDraft('')
  }

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (title.trim().length < 3) { setError('Titlul e prea scurt.'); return }
    if (rows.length === 0) { setError('Călătoria are nevoie de cel puțin o oprire.'); return }

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let finalCover = coverUrl
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `trips/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('images').upload(path, coverFile)
        if (uploadError) throw new Error(`Coperta nu a putut fi încărcată: ${uploadError.message}`)
        finalCover = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const { error: tripError } = await supabase
        .from('trips')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          duration_days: durationDays,
          transport_type: transportType,
          countries,
          cover_image: finalCover,
        })
        .eq('id', id)

      if (tripError) throw new Error(tripError.message)

      // diff în loc de delete-all + insert: dacă un pas eșuează,
      // nu rămâne itinerarul gol
      const perDay: Record<number, number> = {}
      const withPositions = rows.map(row => {
        const position = perDay[row.day] ?? 0
        perDay[row.day] = position + 1
        return { ...row, position }
      })

      const keptIds = withPositions.filter(r => r.rowId).map(r => r.rowId as string)
      const removedIds = initialRowIds.filter(rowId => !keptIds.includes(rowId))

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase.from('trip_locations').delete().in('id', removedIds)
        if (deleteError) throw new Error(`Nu am putut șterge opririle scoase: ${deleteError.message}`)
      }

      for (const row of withPositions.filter(r => r.rowId)) {
        const { error: updateError } = await supabase
          .from('trip_locations')
          .update({ day: row.day, note: row.note.trim() || null, position: row.position })
          .eq('id', row.rowId as string)
        if (updateError) throw new Error(`Nu am putut actualiza itinerarul: ${updateError.message}`)
      }

      const added = withPositions.filter(r => !r.rowId)
      if (added.length > 0) {
        const { error: insertError } = await supabase.from('trip_locations').insert(
          added.map(row => ({
            trip_id: id,
            location_id: row.locationId,
            day: row.day,
            note: row.note.trim() || null,
            position: row.position,
          }))
        )
        if (insertError) throw new Error(`Nu am putut adăuga opririle noi: ${insertError.message}`)
      }

      router.push(`/trip/${id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'A apărut o eroare.')
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (notFound || !allowed) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">🔒</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">
        {notFound ? 'Călătoria nu a fost găsită' : 'Poți edita doar călătoriile tale'}
      </p>
      <Link href="/trips" className="text-[#E8440A] font-medium">← Vezi toate călătoriile</Link>
    </div>
  )

  const days = Array.from({ length: Math.max(durationDays, ...rows.map(r => r.day), 1) }, (_, i) => i + 1)
  const shownCover = coverPreview || coverUrl

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/trip/${id}`} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
              <ArrowLeft size={16} className="text-[#6B6B6B]" />
            </Link>
            <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate">Editează călătoria</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-70 flex-shrink-0"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Se salvează' : 'Salvează'}
          </button>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 py-5 flex flex-col gap-4">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* Detalii */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-4">Detalii</h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Titlu</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Descriere</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 2000))}
                rows={4}
                className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Durată</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setDurationDays(d => Math.max(1, d - 1))} className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] text-lg">−</button>
                <div className="font-outfit text-[18px] font-bold text-[#0F0F0F] min-w-[70px] text-center">
                  {durationDays} {durationDays === 1 ? 'zi' : 'zile'}
                </div>
                <button onClick={() => setDurationDays(d => Math.min(60, d + 1))} className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] text-lg">+</button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Transport</label>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTransportType(t.id)}
                    className={`px-3 py-2 rounded-full text-[12px] font-medium border transition-all ${transportType === t.id ? 'bg-[#FFF0EB] text-[#E8440A] border-[rgba(232,68,10,0.25)]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'}`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Țări</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={countryDraft}
                  onChange={e => setCountryDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountry() } }}
                  placeholder="Ex: România"
                  className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors"
                />
                <button onClick={addCountry} className="w-11 h-11 rounded-xl bg-[#EEEDFB] text-[#5B4FCF] flex items-center justify-center flex-shrink-0" aria-label="Adaugă țara">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {countries.map(c => (
                  <span key={c} className="bg-[#EEEDFB] text-[#5B4FCF] text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    {c}
                    <button onClick={() => setCountries(prev => prev.filter(x => x !== c))} aria-label={`Șterge ${c}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Copertă */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-4">Copertă</h2>
          <input id="cover-input" type="file" accept="image/*" className="hidden" onChange={pickCover} />
          {shownCover ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={shownCover} alt="" className="w-full h-44 object-cover" />
              <button
                onClick={() => { setCoverFile(null); setCoverPreview(null); setCoverUrl(null) }}
                className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
                aria-label="Șterge coperta"
              >
                <X size={15} className="text-white" />
              </button>
              <label htmlFor="cover-input" className="absolute bottom-2.5 right-2.5 bg-white/90 text-[#0F0F0F] text-[12px] font-medium px-3 py-1.5 rounded-full cursor-pointer">
                Schimbă
              </label>
            </div>
          ) : (
            <label htmlFor="cover-input" className="w-full h-40 rounded-xl border-2 border-dashed border-[rgba(232,68,10,0.3)] bg-[#FFF0EB] flex flex-col items-center justify-center gap-2 cursor-pointer">
              <Camera size={26} className="text-[#E8440A]" />
              <span className="text-[13px] text-[#E8440A] font-medium">Alege o poză</span>
            </label>
          )}
        </section>

        {/* Itinerar */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">Itinerar</h2>
          <p className="text-[12px] text-[#9B9B9B] mb-4">Ordinea din listă dă ordinea opririlor din fiecare zi.</p>

          <div className="relative mb-4">
            <div className="flex items-center gap-2 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3">
              <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Adaugă o oprire..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9B9B9B]"
              />
              {searching && <Loader2 size={14} className="animate-spin text-[#9B9B9B]" />}
            </div>

            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-lg z-20 overflow-hidden">
                {results.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => addLocation(loc)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#F8F7F5] text-left border-b border-[rgba(0,0,0,0.05)] last:border-0"
                  >
                    <MapPin size={15} className="text-[#E8440A] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[#0F0F0F] truncate">{loc.name}</div>
                      <div className="text-[11px] text-[#9B9B9B] truncate">{loc.city || 'Fără oraș'}</div>
                    </div>
                    <Plus size={15} className="text-[#5B4FCF] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {rows.map((row, i) => (
              <div key={row.key} className="border border-[rgba(0,0,0,0.08)] rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="w-6 h-6 rounded-md bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30"
                      aria-label="Mută mai sus"
                    >
                      <ArrowUp size={12} className="text-[#6B6B6B]" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      className="w-6 h-6 rounded-md bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30"
                      aria-label="Mută mai jos"
                    >
                      <ArrowDown size={12} className="text-[#6B6B6B]" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{row.name}</p>
                    <p className="text-[11px] text-[#9B9B9B] truncate">{row.city || 'Fără oraș'}</p>
                  </div>

                  <button onClick={() => removeRow(row.key)} className="text-[#DC2626] flex-shrink-0" aria-label="Scoate oprirea">
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={row.day}
                    onChange={e => updateRow(row.key, { day: Number(e.target.value) })}
                    className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2.5 py-2 text-[12px] outline-none flex-shrink-0"
                  >
                    {days.map(d => <option key={d} value={d}>Ziua {d}</option>)}
                  </select>
                  <input
                    value={row.note}
                    onChange={e => updateRow(row.key, { note: e.target.value.slice(0, 200) })}
                    placeholder="Notă (opțional)"
                    className="flex-1 min-w-0 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#E8440A] transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="text-[13px] text-[#9B9B9B] text-center py-6">Nicio oprire. Caută una mai sus.</p>
          )}
        </section>
      </div>
    </div>
  )
}
