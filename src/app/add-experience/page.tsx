'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera, X, Star, Loader2, MapPin } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'

const TIPS_OPTIONS = [
  'Merită prețul', 'Bun pentru familie', 'Parcare ușoară',
  'Aglomerat weekend', 'Mergi dimineața', 'Rezervă online',
  'Accesibil cu copii', 'Gratuit', 'Peisaj spectaculos'
]

const STEPS = ['Locație', 'Poze', 'Rating', 'Povestea ta', 'Publică']

function StarRating({ value, onChange, label, required }: {
  value: number
  onChange: (v: number) => void
  label: string
  required?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
      <div>
        <div className="text-[13px] font-medium text-[#0F0F0F]">{label}</div>
        <div className="text-[11px] text-[#9B9B9B]">{required ? 'Obligatoriu' : 'Opțional'}</div>
      </div>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(i => (
          <button key={i} onClick={() => onChange(i === value ? 0 : i)}>
            <Star size={24} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AddExperienceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [locationId, setLocationId] = useState<string | null>(searchParams.get('location'))
  const [locationName, setLocationName] = useState(searchParams.get('name') || '')
  const [locationCity, setLocationCity] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [ratingExp, setRatingExp] = useState(0)
  const [ratingAccess, setRatingAccess] = useState(0)
  const [ratingCrowd, setRatingCrowd] = useState(0)
  const [content, setContent] = useState('')
  const [tips, setTips] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    if (locationId && locationName) setStep(1)
  }, [locationId, locationName])

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > 5) { setError('Maxim 5 fotografii'); return }
    setPhotos(prev => [...prev, ...files])
    files.forEach(file => setPhotoUrls(prev => [...prev, URL.createObjectURL(file)]))
  }

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))
  }

  const toggleTip = (tip: string) => {
    setTips(prev => prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip])
  }

  const canProceed = () => {
    if (step === 0) return locationName.trim().length > 0
    if (step === 2) return ratingExp > 0
    if (step === 3) return content.trim().length >= 20
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const imageUrls: string[] = []
      for (const photo of photos) {
        const ext = photo.name.split('.').pop()
        const path = `experiences/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('images').upload(path, photo)
        if (!uploadError) {
          const { data } = supabase.storage.from('images').getPublicUrl(path)
          imageUrls.push(data.publicUrl)
        }
      }

      let finalLocationId = locationId
      if (!finalLocationId) {
        const { data: existingLoc } = await supabase
          .from('locations')
          .select('id')
          .ilike('name', locationName.trim())
          .limit(1)
          .maybeSingle()

        if (existingLoc) {
          finalLocationId = existingLoc.id
        } else {
          const { data: newLoc, error: locError } = await supabase
            .from('locations')
            .insert({
              name: locationName.trim(),
              city: locationCity.trim(),
              country: 'România',
              status: 'pending',
              added_by: user.id,
            })
            .select('id')
            .single()
          if (locError) throw new Error(`Eroare locație: ${locError.message}`)
          finalLocationId = newLoc?.id || null
        }
      }

      if (!finalLocationId) throw new Error('Nu am putut identifica locația')

      const { error: expError } = await supabase.from('experiences').insert({
        location_id: finalLocationId,
        author_id: user.id,
        content: content.trim(),
        rating_experience: ratingExp,
        rating_access: ratingAccess || null,
        rating_crowd: ratingCrowd || null,
        images: imageUrls,
        tips,
        status: isPublic ? 'active' : 'draft',
      })

      if (expError) throw expError

      toast('Experiență publicată! 🎉')
      router.push(finalLocationId ? `/location/${finalLocationId}` : '/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'A apărut o eroare.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30 max-w-[680px] mx-auto">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <ArrowLeft size={16} className="text-[#6B6B6B]" />
            </button>
          ) : (
            <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <ArrowLeft size={16} className="text-[#6B6B6B]" />
            </Link>
          )}
          <div>
            <div className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">{STEPS[step]}</div>
            <div className="text-[11px] text-[#9B9B9B]">Pasul {step + 1} din {STEPS.length}</div>
          </div>
        </div>
        {step < 4 && (
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

          {step === 0 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Despre ce loc scrii?</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-6">Introdu numele locului pe care l-ai vizitat.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">
                    Numele locului <span className="text-[#E8440A]">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
                    <input
                      type="text"
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="Ex: Castelul Bran, Lacul Roșu..."
                      className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Oraș / Regiune</label>
                  <input
                    type="text"
                    value={locationCity}
                    onChange={e => setLocationCity(e.target.value)}
                    placeholder="Ex: Brașov, România"
                    className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
                  />
                </div>
                {!locationId && (
                  <div className="bg-[#FFFBEB] border border-[rgba(217,119,6,0.2)] rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">⏳</span>
                    <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                      Dacă locul nu există încă pe Pocoloco, îl adăugăm noi — dar apare în căutare
                      și în feed doar după ce un administrator îl aprobă. Experiența ta rămâne salvată.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Adaugă fotografii</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-6">Până la 5 poze din vizita ta.</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
              <div className="flex flex-wrap gap-3 mb-4">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative w-[calc(33%-8px)] aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-[calc(33%-8px)] aspect-square rounded-xl border-2 border-dashed border-[rgba(232,68,10,0.3)] bg-[#FFF0EB] flex flex-col items-center justify-center gap-2"
                  >
                    <Camera size={24} className="text-[#E8440A]" />
                    <span className="text-[11px] text-[#E8440A] font-medium">Adaugă</span>
                  </button>
                )}
              </div>
              <p className="text-[12px] text-[#9B9B9B] text-center">Poți continua și fără poze</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Cum a fost?</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-6">Evaluează experiența ta.</p>
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] px-4 py-2">
                <StarRating value={ratingExp} onChange={setRatingExp} label="Experiență generală" required />
                <StarRating value={ratingAccess} onChange={setRatingAccess} label="Acces și organizare" />
                <StarRating value={ratingCrowd} onChange={setRatingCrowd} label="Aglomerație și așteptare" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Povestește-ne!</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-4">Ce ai trăit? Sfaturi practice, momente speciale.</p>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                placeholder="Ex: Am ajuns dimineața devreme și practic n-am avut coadă..."
                className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1.5 mb-5">
                <span className="text-[11px] text-[#9B9B9B]">Minim 20 caractere</span>
                <span className={`text-[11px] font-medium ${content.length >= 20 ? 'text-[#059669]' : 'text-[#9B9B9B]'}`}>
                  {content.length} / 2000
                </span>
              </div>
              <div className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-3">
                Tips rapide <span className="text-[12px] text-[#9B9B9B] font-normal">— opțional</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIPS_OPTIONS.map(tip => (
                  <button
                    key={tip}
                    onClick={() => toggleTip(tip)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${tips.includes(tip) ? 'bg-[#FFF0EB] text-[#E8440A] border-[rgba(232,68,10,0.25)]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'}`}
                  >
                    {tips.includes(tip) && '✓ '}{tip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Gata de publicat! 🎉</h2>
              <p className="text-[14px] text-[#6B6B6B] mb-5">Verifică detaliile și publică experiența ta.</p>
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={15} className="text-[#E8440A]" />
                  <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">{locationName}</span>
                  {locationCity && <span className="text-[13px] text-[#9B9B9B]">· {locationCity}</span>}
                </div>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={16} className={i <= ratingExp ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed line-clamp-3">{content}</p>
                {photos.length > 0 && (
                  <p className="text-[12px] text-[#9B9B9B] mt-2">{photos.length} fotografie atașată</p>
                )}
                {tips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tips.map(t => (
                      <span key={t} className="text-[11px] bg-[#FFF0EB] text-[#E8440A] px-2 py-0.5 rounded-full">✓ {t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 mb-6 flex items-center justify-between">
                <div>
                  <div className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">Vizibilitate</div>
                  <div className="text-[12px] text-[#9B9B9B]">{isPublic ? 'Oricine poate vedea' : 'Doar tu poți vedea'}</div>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-[#E8440A]' : 'bg-[#D1D5DB]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isPublic ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Se publică...</>
                ) : (
                  '🚀 Publică experiența'
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function AddExperiencePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8440A] border-t-transparent animate-spin" />
      </div>
    }>
      <AddExperienceContent />
    </Suspense>
  )
}
