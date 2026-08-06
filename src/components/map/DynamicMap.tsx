'use client'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

/**
 * Leaflet atinge `window` la import, deci nu poate fi randat pe server.
 * Îl încărcăm doar în browser, cu un schelet cât se aduce bundle-ul.
 */
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F7F5] flex items-center justify-center h-[200px]">
      <Loader2 size={20} className="animate-spin text-[#9B9B9B]" />
    </div>
  ),
})

export default LocationMap
export type { MapMarker } from './LocationMap'
