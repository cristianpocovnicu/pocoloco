'use client'
import { useEffect, useState } from 'react'
import { Expand, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import DynamicMap, { type MapMarker } from '@/components/map/DynamicMap'
import {
  computeTravelStats,
  fetchTravelPoints,
  type TravelPoint,
} from '@/lib/travel-map'

type Props = {
  userId: string
  /** pe profilul propriu arătăm și „Vreau să merg", plus un empty state */
  isOwn?: boolean
}

const COMPACT_HEIGHT = 220

function toMarker(point: TravelPoint): MapMarker {
  return {
    id: point.id,
    lat: point.latitude,
    lng: point.longitude,
    name: point.name,
    subtitle: [point.city, point.country].filter(Boolean).join(', ') || null,
    score: point.score,
    href: `/location/${point.id}`,
    variant: point.status === 'visited' ? 'visited' : 'want',
  }
}

/**
 * Harta călătorului: locurile bifate „Am fost", încadrate automat.
 *
 * Toate punctele vin dintr-o singură cerere (vezi lib/travel-map.ts), iar
 * Leaflet e încărcat doar în browser prin DynamicMap.
 */
export default function TravelMap({ userId, isOwn }: Props) {
  const [points, setPoints] = useState<TravelPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showWant, setShowWant] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const data = await fetchTravelPoints(
        supabase,
        userId,
        isOwn ? ['visited', 'want_to_go'] : ['visited']
      )
      if (!active) return
      setPoints(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [userId, isOwn])

  // harta mare: Escape închide, fundalul nu mai scrollează
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [expanded])

  const visited = points.filter(p => p.status === 'visited')
  const wanted = points.filter(p => p.status === 'want_to_go')
  const stats = computeTravelStats(points)

  const shown = showWant ? [...visited, ...wanted] : visited
  const markers = shown.map(toMarker)

  if (loading) return (
    <div className="px-5 pt-4">
      <div
        className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white flex items-center justify-center"
        style={{ height: COMPACT_HEIGHT }}
      >
        <Loader2 size={20} className="animate-spin text-[#9B9B9B]" />
      </div>
    </div>
  )

  // fără locuri vizitate cu coordonate: pe profilul altcuiva secțiunea dispare
  if (visited.length === 0) {
    if (!isOwn) return null
    return (
      <div className="px-5 pt-4">
        <div className="rounded-2xl border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-5 py-6 text-center">
          <div className="text-3xl mb-1.5">🗺️</div>
          <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-0.5">
            Harta ta e goală deocamdată
          </p>
          <p className="text-[12px] text-[#9B9B9B] leading-relaxed">
            Marchează locurile vizitate și construiește-ți harta.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Harta mea</h2>
        <button
          onClick={() => setExpanded(true)}
          className="text-[12px] text-[#5B4FCF] font-medium flex items-center gap-1"
        >
          <Expand size={12} /> Extinde
        </button>
      </div>

      {/* clickul pe fundalul hărții deschide harta mare; pinii își păstrează popup-ul */}
      <DynamicMap
        markers={markers}
        height={COMPACT_HEIGHT}
        zoom={9}
        fitMaxZoom={11}
        onMapClick={() => setExpanded(true)}
      />

      {isOwn && wanted.length > 0 && (
        <button
          onClick={() => setShowWant(v => !v)}
          className={`mt-2 text-[11px] font-outfit font-medium px-3 py-1.5 rounded-full border transition-colors ${
            showWant
              ? 'bg-[#EEEDFB] text-[#5B4FCF] border-[rgba(91,79,207,0.25)]'
              : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'
          }`}
        >
          {showWant ? '✓ ' : ''}{'Arată și „Vreau să merg”'} ({wanted.length})
        </button>
      )}

      <TravelStatsRow stats={stats} />

      {expanded && (
        <div className="fixed inset-0 z-[70] bg-[#F0EDE8] flex flex-col" role="dialog" aria-modal="true">
          <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="min-w-0">
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Harta mea</p>
              <p className="text-[11px] text-[#9B9B9B]">
                {stats.visited} {stats.visited === 1 ? 'loc vizitat' : 'locuri vizitate'}
                {showWant && wanted.length > 0 ? ` · ${wanted.length} pe listă` : ''}
              </p>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-9 h-9 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
              aria-label="Închide harta"
            >
              <X size={17} className="text-[#6B6B6B]" />
            </button>
          </div>

          <div className="flex-1 min-h-0 p-3">
            <FullscreenMap markers={markers} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Harta mare umple ce a rămas din ecran, deci înălțimea se măsoară la montare. */
function FullscreenMap({ markers }: { markers: MapMarker[] }) {
  const [height, setHeight] = useState(420)

  useEffect(() => {
    const measure = () => setHeight(Math.max(280, window.innerHeight - 90))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return <DynamicMap markers={markers} height={height} zoom={9} scrollWheelZoom />
}

function TravelStatsRow({ stats }: { stats: ReturnType<typeof computeTravelStats> }) {
  const items = [
    `${stats.visited} ${stats.visited === 1 ? 'loc vizitat' : 'locuri vizitate'}`,
    // fără țară completată în locații, contorul ar arăta mereu 0
    stats.countries > 0 ? `${stats.countries} ${stats.countries === 1 ? 'țară' : 'țări'}` : null,
    stats.topCategory ? `${stats.topCategory.icon} ${stats.topCategory.label}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2.5 text-[12px] text-[#6B6B6B]">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-2">
          {i > 0 && <span className="text-[#D6D3CE]">·</span>}
          {item}
        </span>
      ))}
    </div>
  )
}
