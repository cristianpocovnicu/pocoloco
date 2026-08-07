'use client'
import { useRef, useState } from 'react'
import { Camera, Loader2, Minus, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { TRANSPORT_TYPES } from '@/lib/utils'
import CharCounter from '@/components/ui/CharCounter'
import CountryPicker from '@/components/trip/CountryPicker'
import { suggestTripTitle, type StopDraft, type TripDraft } from '@/lib/story'

type Props = {
  trip: TripDraft
  stops: StopDraft[]
  onChange: (patch: Partial<TripDraft>) => void
}

/**
 * Nume, durată, transport, copertă — câmpurile pasului de finalizare.
 *
 * Aici se ajunge doar cu două locuri deja povestite, deci cuvântul
 * „călătorie" are voie să apară: numește rezultatul, nu îl anunță.
 */
export default function OutingCard({ trip, stops, onChange }: Props) {
  const photos = stops.flatMap(stop => stop.images)
  const suggestion = suggestTripTitle(stops)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  /** coperta încărcată aici, dacă nu vine din pozele locurilor */
  const uploaded = trip.coverImage && !photos.includes(trip.coverImage) ? trip.coverImage : null
  const thumbs = uploaded ? [uploaded, ...photos] : photos

  /**
   * Aceeași destinație ca la editarea călătoriei: bucket-ul `images`,
   * sub `trips/<user>/`. Diferența e momentul — acolo fișierul se ține în
   * stare până la salvare, aici se urcă imediat, pentru că draftul poate
   * ține un URL, nu un File.
   *
   * O poză înlocuită rămâne în bucket, ca și cele din povești abandonate:
   * aceeași curățenie de făcut separat.
   */
  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `trips/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file)

    if (error) {
      setUploadError('Poza nu a putut fi încărcată. Încearcă din nou.')
    } else {
      // urcată de om, deci aleasă de om: cover_source rămâne 'user'
      onChange({ coverImage: supabase.storage.from('images').getPublicUrl(path).data.publicUrl })
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
      <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Cum o numim?</label>
      <input
        value={trip.title}
        onChange={e => onChange({ title: e.target.value.slice(0, 120) })}
        placeholder={suggestion ? `Ex: ${suggestion}` : 'Ex: Weekend în munți'}
        className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] mb-1"
      />
      {!trip.title.trim() && suggestion && (
        <button type="button"
          onClick={() => onChange({ title: suggestion })}
          className="text-[12px] text-[#5B4FCF] font-medium mb-3"
        >
          Folosește „{suggestion}&rdquo;
        </button>
      )}

      <div className="py-3 border-t border-[rgba(0,0,0,0.06)] mt-3">
        <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">
          Povestea călătoriei <span className="text-[#9B9B9B] font-normal">— opțional</span>
        </label>
        <textarea
          value={trip.description}
          onChange={e => onChange({ description: e.target.value.slice(0, 20000) })}
          rows={5}
          placeholder="Cum a fost, per total? Sfaturi despre buget, vreme, transport — tot ce ține de întreaga ieșire, nu de un singur loc."
          className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed"
        />
        <CharCounter value={trip.description} max={20000} />
      </div>

      <div className="flex items-center justify-between py-3 border-t border-[rgba(0,0,0,0.06)]">
        <span className="text-[13px] text-[#6B6B6B]">Câte zile a ținut</span>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => onChange({ durationDays: Math.max(trip.durationDays - 1, 1) })}
            aria-label="Mai puține zile"
            className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center"
          >
            <Minus size={14} className="text-[#6B6B6B]" />
          </button>
          <span className="font-outfit text-[15px] font-semibold text-[#0F0F0F] w-6 text-center">
            {trip.durationDays}
          </span>
          <button type="button"
            onClick={() => onChange({ durationDays: Math.min(trip.durationDays + 1, 60) })}
            aria-label="Mai multe zile"
            className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center"
          >
            <Plus size={14} className="text-[#6B6B6B]" />
          </button>
        </div>
      </div>

      <div className="py-3 border-t border-[rgba(0,0,0,0.06)]">
        <span className="text-[13px] text-[#6B6B6B] block mb-2">Cum ai ajuns</span>
        <div className="flex flex-wrap gap-1.5">
          {TRANSPORT_TYPES.map(type => (
            <button type="button"
              key={type.id}
              onClick={() => onChange({ transportType: type.id })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                trip.transportType === type.id
                  ? 'bg-[#FFF0EB] text-[#E8440A] border-[rgba(232,68,10,0.25)]'
                  : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
              }`}
            >
              {type.emoji} {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="py-3 border-t border-[rgba(0,0,0,0.06)]">
        <span className="text-[13px] text-[#6B6B6B] block mb-2">În ce țări</span>
        <CountryPicker
          value={trip.countries}
          onChange={countries => onChange({ countries })}
        />
      </div>

      <div className="py-3 border-t border-[rgba(0,0,0,0.06)]">
        <span className="text-[13px] text-[#6B6B6B] block mb-2">Coperta</span>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />

        {thumbs.length > 0 ? (
          <>
          <p className="text-[12px] text-[#9B9B9B] mb-1.5">Alege coperta:</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {thumbs.map(url => {
              const chosen = (trip.coverImage || thumbs[0]) === url
              return (
                <div key={url} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onChange({ coverImage: url })}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all block ${
                      chosen ? 'border-[#E8440A]' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>

                  {/* doar poza încărcată aici se poate scoate: restul sunt
                      ale locurilor și se schimbă de la ele */}
                  {url === uploaded && (
                    <button
                      type="button"
                      onClick={() => onChange({ coverImage: null })}
                      aria-label="Scoate poza încărcată"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  )}
                </div>
              )
            })}

          </div>

          {/* aici prima opțiune e deja o acțiune, deci upload-ul vine al doilea */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-[12px] text-[#5B4FCF] font-medium flex items-center gap-1.5 mt-2 disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 size={13} className="animate-spin" /> Se încarcă</>
              : '+ Sau încarcă alta'}
          </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-5 rounded-xl border-2 border-dashed border-[rgba(232,68,10,0.3)] bg-[#FFF0EB] flex flex-col items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {uploading
                ? <Loader2 size={20} className="animate-spin text-[#E8440A]" />
                : <Camera size={20} className="text-[#E8440A]" />}
              <span className="text-[12px] text-[#E8440A] font-medium">
                {uploading ? 'Se urcă' : 'Încarcă o poză de copertă'}
              </span>
            </button>
            <p className="text-[12px] text-[#9B9B9B] leading-relaxed mt-2">
              Dacă nu încarci, alegem noi una din locurile tale — o poți schimba oricând.
            </p>
          </>
        )}

        {uploadError && <p className="text-[12px] text-[#DC2626] mt-1.5">{uploadError}</p>}
      </div>
    </div>
  )
}
