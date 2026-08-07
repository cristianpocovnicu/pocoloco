'use client'
import { useEffect, useState } from 'react'
import { Loader2, MapPin, Plane, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'

type TripOption = {
  id: string
  title: string
  stops: number
}

type Props = {
  experienceId: string
  /** completat doar pentru experiențele de loc */
  locationId: string | null
  title: string
  /** „poate mai târziu" sau după ce oprirea a fost adăugată */
  onDone: () => void
}

/**
 * Ecranul de după publicare: „o adaugi într-o călătorie?"
 *
 * O călătorie e un album, iar o experiență proaspăt scrisă e cel mai
 * probabil dintr-o vacanță pe care userul deja o povestește. Aici o
 * leagă, fără să treacă prin editorul de itinerar.
 *
 * Călătoria nouă cere un singur lucru: numele. Restul (copertă, descriere,
 * zile) se completează oricând din editare.
 */
export default function AddToTripDialog({ experienceId, locationId, title, onDone }: Props) {
  const toast = useToast()
  const [trips, setTrips] = useState<TripOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('trips')
        .select('id, title')
        .eq('author_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      const rows = (data || []) as { id: string; title: string }[]
      if (rows.length === 0) { setLoading(false); return }

      // numărul de opriri, o singură cerere pentru toate călătoriile
      const { data: stops } = await supabase
        .from('trip_locations')
        .select('trip_id')
        .in('trip_id', rows.map(r => r.id))

      const counts: Record<string, number> = {}
      for (const stop of (stops || []) as { trip_id: string }[]) {
        counts[stop.trip_id] = (counts[stop.trip_id] || 0) + 1
      }

      setTrips(rows.map(r => ({ id: r.id, title: r.title, stops: counts[r.id] || 0 })))
      setLoading(false)
    }
    load()
  }, [])

  /** Oprirea se pune la coada ultimei zile din itinerar. */
  const addStop = async (tripId: string) => {
    setBusyId(tripId)
    setError(null)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('trip_locations')
      .select('day:day_number, position')
      .eq('trip_id', tripId)

    const rows = (existing || []) as { day: number | null; position: number | null }[]
    const lastDay = rows.length > 0 ? Math.max(...rows.map(r => r.day ?? 1)) : 1
    const inLastDay = rows.filter(r => (r.day ?? 1) === lastDay).length

    const { error: insertError } = await supabase.from('trip_locations').insert({
      trip_id: tripId,
      // o vizită intră ca locație (ca până acum), o activitate ca experiență
      location_id: locationId,
      experience_id: locationId ? null : experienceId,
      day_number: lastDay,
      position: inLastDay,
    })

    if (insertError) {
      setError('Nu am putut adăuga. Încearcă din editare.')
      setBusyId(null)
      return
    }

    toast('Adăugat ✈️')
    onDone()
  }

  const createTrip = async () => {
    const name = newTitle.trim()
    if (name.length < 3) return

    setBusyId('new')
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusyId(null); return }

    // doar numele; coperta, descrierea și zilele se completează din editare
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        author_id: user.id,
        title: name,
        duration_days: 1,
        transport_type: 'car',
        countries: [],
        status: 'active',
      })
      .select('id')
      .single()

    if (tripError || !trip) {
      setError('Nu am putut crea ieșirea.')
      setBusyId(null)
      return
    }

    await addStop(trip.id)
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="max-w-[680px] mx-auto px-5 pt-10 pb-24">
        <div className="text-center mb-7">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1">Publicat!</h1>
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
            „{title}&rdquo; face parte dintr-o ieșire mai lungă?
          </p>
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-[#E8440A]" />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mb-5">
            {trips.map(trip => (
              <button
                key={trip.id}
                onClick={() => addStop(trip.id)}
                disabled={!!busyId}
                className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left hover:border-[rgba(0,0,0,0.15)] transition-colors disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
                  <MapPin size={17} className="text-[#5B4FCF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">{trip.title}</p>
                  <p className="text-[12px] text-[#9B9B9B]">
                    {trip.stops} {trip.stops === 1 ? 'loc' : 'locuri'}
                  </p>
                </div>
                {busyId === trip.id
                  ? <Loader2 size={16} className="animate-spin text-[#5B4FCF] flex-shrink-0" />
                  : <Plus size={16} className="text-[#9B9B9B] flex-shrink-0" />}
              </button>
            ))}

            {creating ? (
              <div className="bg-white border border-[rgba(91,79,207,0.25)] rounded-2xl p-4">
                <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">
                  Cum o numim?
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value.slice(0, 120))}
                  onKeyDown={e => { if (e.key === 'Enter') createTrip() }}
                  placeholder="Ex: Egipt, martie 2026"
                  autoFocus
                  className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#5B4FCF] transition-colors placeholder:text-[#9B9B9B] mb-2.5"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createTrip}
                    disabled={newTitle.trim().length < 3 || !!busyId}
                    className="flex-1 bg-[#5B4FCF] text-white font-outfit text-[13px] font-semibold py-2.5 rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busyId === 'new' && <Loader2 size={14} className="animate-spin" />}
                    Creează și adaugă
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewTitle('') }}
                    className="px-4 text-[13px] text-[#6B6B6B] font-medium"
                  >
                    Renunță
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                disabled={!!busyId}
                className="bg-white border border-dashed border-[rgba(91,79,207,0.35)] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
                  <Plane size={17} className="text-[#5B4FCF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-outfit text-[14px] font-semibold text-[#5B4FCF]">Ieșire nouă</p>
                  <p className="text-[12px] text-[#9B9B9B]">Doar numele — restul, oricând mai târziu</p>
                </div>
              </button>
            )}
          </div>
        )}

        <button
          onClick={onDone}
          disabled={!!busyId}
          className="w-full text-[13px] text-[#6B6B6B] font-outfit font-medium py-3 disabled:opacity-50"
        >
          Poate mai târziu
        </button>
      </div>
    </div>
  )
}
