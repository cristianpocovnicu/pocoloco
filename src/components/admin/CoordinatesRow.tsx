'use client'
import { useEffect, useState } from 'react'
import { Check, Crosshair, Loader2, MapPin } from 'lucide-react'

type Props = {
  latitude: number | null
  longitude: number | null
  /** rulează geocodarea pentru locația asta */
  onGeocode: () => void
  onSave: (lat: number | null, lng: number | null) => Promise<string | null>
  geocoding: boolean
  placesEnabled: boolean
}

/** Coordonatele unei locații: le vezi, le poți geocoda sau corecta de mână. */
export default function CoordinatesRow({
  latitude,
  longitude,
  onGeocode,
  onSave,
  geocoding,
  placesEnabled,
}: Props) {
  const [lat, setLat] = useState(latitude?.toString() ?? '')
  const [lng, setLng] = useState(longitude?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // geocodarea schimbă valorile din afară — inputurile trebuie să urmeze
  useEffect(() => {
    setLat(latitude?.toString() ?? '')
    setLng(longitude?.toString() ?? '')
  }, [latitude, longitude])

  const hasCoords = latitude != null && longitude != null
  const dirty = lat !== (latitude?.toString() ?? '') || lng !== (longitude?.toString() ?? '')

  const save = async () => {
    const parsedLat = lat.trim() === '' ? null : Number(lat.replace(',', '.'))
    const parsedLng = lng.trim() === '' ? null : Number(lng.replace(',', '.'))

    if ((parsedLat !== null && !Number.isFinite(parsedLat)) || (parsedLng !== null && !Number.isFinite(parsedLng))) {
      setError('Coordonate invalide')
      return
    }
    if (parsedLat !== null && (parsedLat < -90 || parsedLat > 90)) {
      setError('Latitudinea e între -90 și 90')
      return
    }
    if (parsedLng !== null && (parsedLng < -180 || parsedLng > 180)) {
      setError('Longitudinea e între -180 și 180')
      return
    }

    setSaving(true)
    setError(null)
    const saveError = await onSave(parsedLat, parsedLng)
    setSaving(false)

    if (saveError) {
      setError(saveError)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {!hasCoords && (
        <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center gap-1">
          <MapPin size={9} /> FĂRĂ COORDONATE
        </span>
      )}

      <input
        value={lat}
        onChange={e => setLat(e.target.value)}
        placeholder="lat"
        inputMode="decimal"
        aria-label="Latitudine"
        className="w-[86px] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#E8440A] transition-colors"
      />
      <input
        value={lng}
        onChange={e => setLng(e.target.value)}
        placeholder="lng"
        inputMode="decimal"
        aria-label="Longitudine"
        className="w-[86px] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#E8440A] transition-colors"
      />

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="text-[11px] bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Salvează
        </button>
      )}

      {saved && !dirty && <span className="text-[11px] text-[#059669] font-medium">Salvat</span>}

      {placesEnabled && (
        <button
          onClick={onGeocode}
          disabled={geocoding}
          title="Caută coordonatele după nume și oraș"
          className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
        >
          {geocoding ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
          Geocodează
        </button>
      )}

      {error && <span className="text-[11px] text-[#DC2626]">{error}</span>}
    </div>
  )
}
