'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Check, Loader2, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { TRANSPORT_TYPES } from '@/lib/utils'
import CountryPicker from '@/components/trip/CountryPicker'
import ItineraryLocationPicker, { type PickedLocation } from '@/components/trip/ItineraryLocationPicker'
import TellUsMorePrompt, { type StopWithoutReview } from '@/components/trip/TellUsMorePrompt'
import CharCounter from '@/components/ui/CharCounter'
import { useToast } from '@/components/ui/Toast'

const STEPS = ['Detalii', 'Itinerar', 'Copertă', 'Publică']

type ItineraryDraft = {
  key: string
  location: PickedLocation
  day: number
  note: string
}

export default function NewTripPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishedTripId, setPublishedTripId] = useState<string | null>(null)
  const [stopsToReview, setStopsToReview] = useState<StopWithoutReview[]>([])
  const [error, setError] = useState('')

  // pas 1
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationDays, setDurationDays] = useState(3)
  const [transportType, setTransportType] = useState('car')
  const [countries, setCountries] = useState<string[]>([])
  const [isGuide, setIsGuide] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // pas 2
  const [items, setItems] = useState<ItineraryDraft[]>([])

  // pas 3
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      // steagul de ghid e vizibil doar echipei
      const { data: prof } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      setIsAdmin(prof?.role === 'admin')
    })
  }, [router])

  const addLocation = (location: PickedLocation) => {
    const lastDay = items.length > 0 ? Math.max(...items.map(i => i.day)) : 1
    setItems(prev => [...prev, {
      key: `${location.id}-${prev.length}`,
      location,
      day: Math.min(lastDay, durationDays),
      note: '',
    }])
  }

  const updateItem = (key: string, patch: Partial<ItineraryDraft>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key))


  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const canProceed = () => {
    if (step === 0) return title.trim().length >= 3 && durationDays >= 1
    if (step === 1) return items.length > 0
    return true
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let coverUrl: string | null = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `trips/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('images').upload(path, coverFile)
        if (uploadError) throw new Error(`Coperta nu a putut fi încărcată: ${uploadError.message}`)
        coverUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          author_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          duration_days: durationDays,
          transport_type: transportType,
          countries,
          cover_image: coverUrl,
          is_guide: isGuide,
          status: 'active',
        })
        .select('id')
        .single()

      if (tripError || !trip) throw new Error(tripError?.message || 'Călătoria nu a putut fi salvată.')

      // poziția e ordinea în cadrul zilei
      const perDay: Record<number, number> = {}
      const rows = items.map(item => {
        const position = perDay[item.day] ?? 0
        perDay[item.day] = position + 1
        return {
          trip_id: trip.id,
          location_id: item.location.id,
          // coloana din bază e day_number, nu day
          day_number: item.day,
          note: item.note.trim() || null,
          position,
        }
      })

      const { error: itineraryError } = await supabase.from('trip_locations').insert(rows)
      if (itineraryError) throw new Error(`Itinerarul nu a putut fi salvat: ${itineraryError.message}`)

      // opririle despre care userul n-a scris încă
      const locationIds = items.map(item => item.location.id)
      const { data: mine } = await supabase
        .from('experiences')
        .select('location_id')
        .eq('author_id', user.id)
        .eq('status', 'active')
        .in('location_id', locationIds)

      const written = new Set((mine || []).map((e: { location_id: string }) => e.location_id))
      const missing = items
        .filter(item => !written.has(item.location.id))
        .map(item => ({ id: item.location.id, name: item.location.name, city: item.location.city }))

      toast('Călătorie publicată! 🎉')

      if (missing.length > 0) {
        setPublishedTripId(trip.id)
        setStopsToReview(missing)
        setPublishing(false)
        return
      }

      router.push(`/trip/${trip.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'A apărut o eroare.')
      setPublishing(false)
    }
  }

  const days = Array.from({ length: Math.max(durationDays, ...items.map(i => i.day), 1) }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30 max-w-[680px] mx-auto">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <ArrowLeft size={16} className="text-[#6B6B6B]" />
            </button>
          ) : (
            <Link href="/trips" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <ArrowLeft size={16} className="text-[#6B6B6B]" />
            </Link>
          )}
          <div>
            <div className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">{STEPS[step]}</div>
            <div className="text-[11px] text-[#9B9B9B]">Pasul {step + 1} din {STEPS.length}</div>
          </div>
        </div>
        {step < STEPS.length - 1 && (
          <button
            onClick={() => canProceed() && setStep(s => s + 1)}
            className={`font-outfit text-[13px] font-semibold px-4 py-2 rounded-full transition-all ${canProceed() ? 'bg-[#E8440A] text-white' : 'bg-[#F8F7F5] text-[#9B9B9B]'}`}
          >
            Continuă
          </button>
        )}
      </div>

      <div className="max-w-[680px] mx-auto">
        <div className="flex gap-1 px-5 py-2 bg-white">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-[#E8440A]' : 'bg-[rgba(0,0,0,0.08)]'}`} />
          ))}
        </div>

        {error && (
          <div className="mx-5 mt-3 bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        <div className="px-5 pt-6 pb-24">
          {/* Pas 1 — detalii */}
          {step === 0 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Despre călătoria ta</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-6">Câteva detalii ca ceilalți să știe la ce să se aștepte.</p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">
                    Titlu <span className="text-[#E8440A]">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: 7 zile în Ardeal, fără hotel"
                    className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Descriere</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, 20000))}
                    rows={4}
                    placeholder="Cum a fost drumul, ce ai învățat, ce ai face altfel..."
                    className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed"
                  />
                  <CharCounter value={description} max={20000} />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Durată</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDurationDays(d => Math.max(1, d - 1))}
                      className="w-10 h-10 rounded-full bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] text-lg"
                    >−</button>
                    <div className="font-outfit text-[18px] font-bold text-[#0F0F0F] min-w-[70px] text-center">
                      {durationDays} {durationDays === 1 ? 'zi' : 'zile'}
                    </div>
                    <button
                      onClick={() => setDurationDays(d => Math.min(60, d + 1))}
                      className="w-10 h-10 rounded-full bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] text-lg"
                    >+</button>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Cum ai călătorit</label>
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
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Țări vizitate</label>
                  <CountryPicker value={countries} onChange={setCountries} />
                </div>

                {isAdmin && (
                  <div className="bg-[#EEEDFB] border border-[rgba(91,79,207,0.2)] rounded-xl px-4 py-3 flex items-start gap-3">
                    <button
                      onClick={() => setIsGuide(!isGuide)}
                      role="checkbox"
                      aria-checked={isGuide}
                      aria-label="Publică drept Ghid Pocoloco"
                      className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${isGuide ? 'bg-[#5B4FCF]' : 'bg-white border border-[rgba(91,79,207,0.3)]'}`}
                    >
                      {isGuide && <Check size={12} className="text-white" />}
                    </button>
                    <div>
                      <p className="text-[13px] font-semibold text-[#5B4FCF]">Publică drept Ghid Pocoloco</p>
                      <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                        Apare cu badge de ghid editorial, înaintea călătoriilor obișnuite.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Pas 2 — itinerar */}
          {step === 1 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Construiește itinerarul</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-2">
                Adaugă obiectivele călătoriei — locurile pe care le-ai vizitat. Le poți
                organiza pe zile sau le lași simplu în ordine.
              </p>
              <p className="text-[12px] text-[#9B9B9B] mb-5">
                Ziua și nota sunt opționale: poți publica și doar cu lista de locuri.
              </p>

              <div className="mb-4">
                <ItineraryLocationPicker
                  onPick={addLocation}
                  excludeIds={items.map(i => i.location.id)}
                />
              </div>

              {items.length === 0 ? (
                <div className="bg-white border border-dashed border-[rgba(0,0,0,0.15)] rounded-2xl py-10 text-center px-5">
                  <div className="text-3xl mb-2">🗺️</div>
                  <p className="text-[13px] text-[#9B9B9B]">
                    Caută mai sus primul obiectiv. Ai nevoie de cel puțin unul ca să continui.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {items.map((item, i) => (
                    <div key={item.key} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5">
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FFF0EB] text-[#E8440A] font-outfit text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{item.location.name}</p>
                          <p className="text-[11px] text-[#9B9B9B] truncate">{item.location.city || 'Fără oraș'}</p>
                        </div>
                        <button onClick={() => removeItem(item.key)} className="text-[#DC2626] flex-shrink-0" aria-label="Șterge din itinerar">
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={item.day}
                          onChange={e => updateItem(item.key, { day: Number(e.target.value) })}
                          aria-label="Ziua (opțional)"
                          className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2.5 py-2 text-[12px] outline-none flex-shrink-0"
                        >
                          {days.map(d => <option key={d} value={d}>Ziua {d} (opțional)</option>)}
                        </select>
                        <input
                          value={item.note}
                          onChange={e => updateItem(item.key, { note: e.target.value.slice(0, 1000) })}
                          placeholder="Notă (opțional) — ex: dimineața, 2 ore"
                          className="flex-1 min-w-0 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pas 3 — copertă */}
          {step === 2 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Pune o poză de copertă</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-6">Apare pe card în feed și pe pagina călătoriei.</p>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />

              {coverPreview ? (
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={coverPreview} alt="" className="w-full h-52 object-cover" />
                  <button
                    onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
                    aria-label="Șterge coperta"
                  >
                    <X size={15} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-52 rounded-2xl border-2 border-dashed border-[rgba(232,68,10,0.3)] bg-[#FFF0EB] flex flex-col items-center justify-center gap-2"
                >
                  <Camera size={28} className="text-[#E8440A]" />
                  <span className="text-[13px] text-[#E8440A] font-medium">Alege o poză</span>
                </button>
              )}

              <p className="text-[12px] text-[#9B9B9B] text-center mt-4">Poți continua și fără copertă.</p>
            </div>
          )}

          {/* Pas 4 — preview */}
          {step === 3 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Gata de publicat! 🎉</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-5">Verifică și publică — poți edita mai târziu.</p>

              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden mb-4">
                {coverPreview
                  ? <img src={coverPreview} alt="" className="w-full h-40 object-cover" />
                  : <div className="w-full h-28 bg-gradient-to-br from-[#5B4FCF] to-[#8B7FE8] flex items-center justify-center text-4xl opacity-60">🧭</div>}

                <div className="p-4">
                  <h3 className="font-outfit text-[17px] font-bold text-[#0F0F0F] mb-1">{title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1">
                      {durationDays} {durationDays === 1 ? 'zi' : 'zile'}
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1">
                      {TRANSPORT_TYPES.find(t => t.id === transportType)?.emoji}{' '}
                      {TRANSPORT_TYPES.find(t => t.id === transportType)?.label}
                    </span>
                    {countries.map(c => (
                      <span key={c} className="text-[11px] text-[#5B4FCF] bg-[#EEEDFB] rounded-full px-2.5 py-1">{c}</span>
                    ))}
                  </div>
                  {description && <p className="text-[13px] text-[#6B6B6B] leading-relaxed line-clamp-3 mb-3">{description}</p>}
                  <p className="text-[12px] text-[#9B9B9B]">
                    {items.length} {items.length === 1 ? 'oprire' : 'opriri'} în itinerar
                  </p>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {publishing ? <><Loader2 size={18} className="animate-spin" /> Se publică...</> : '🚀 Publică călătoria'}
              </button>
            </div>
          )}
        </div>
      </div>

      {publishedTripId && stopsToReview.length > 0 && (
        <TellUsMorePrompt
          stops={stopsToReview}
          onClose={() => router.push(`/trip/${publishedTripId}`)}
        />
      )}
    </div>
  )
}
