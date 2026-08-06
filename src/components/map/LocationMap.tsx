'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  name: string
  /** a doua linie din popup: oraș, categorie, ce vrei */
  subtitle?: string | null
  score?: number | null
  href?: string
}

type Props = {
  markers: MapMarker[]
  /** centrul inițial; fără el, harta încadrează toate markerele */
  center?: [number, number]
  zoom?: number
  height?: number
  /** sub hartă, link către direcții */
  showDirections?: boolean
}

/**
 * Pin în culorile brandului, desenat ca SVG inline — Leaflet altfel cere
 * fișiere PNG servite din /public, iar cele implicite dau 404 în bundle.
 */
const pinIcon = (color: string) =>
  L.divIcon({
    className: 'pocoloco-pin',
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 11.6 20 12.1 20.5.5.4 1.3.4 1.8 0C14.4 33 26 22.2 26 13 26 5.8 20.2 0 13 0z" fill="${color}"/>
      <circle cx="13" cy="13" r="5" fill="white"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -32],
  })

/** Încadrează harta pe toate markerele, când nu primim un centru explicit. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length < 2) return
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 })
  }, [markers, map])

  return null
}

export default function LocationMap({
  markers,
  center,
  zoom = 13,
  height = 200,
  showDirections,
}: Props) {
  if (markers.length === 0) return null

  const first = markers[0]
  const initialCenter: [number, number] = center || [first.lat, first.lng]

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.08)]" style={{ height }}>
        <MapContainer
          center={initialCenter}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap: fără cheie, fără cost — atribuirea e obligatorie */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <FitBounds markers={markers} />

          {markers.map(marker => (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={pinIcon('#E8440A')}>
              <Popup>
                <div className="font-sans">
                  <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] mb-0.5">{marker.name}</p>
                  {marker.subtitle && <p className="text-[11px] text-[#9B9B9B] mb-1">{marker.subtitle}</p>}
                  {(marker.score || 0) > 0 && (
                    <p className="text-[11px] text-[#E8440A] font-semibold mb-1">{marker.score?.toFixed(1)} / 10</p>
                  )}
                  {marker.href && (
                    <Link href={marker.href} className="text-[12px] text-[#5B4FCF] font-medium">
                      Vezi locația →
                    </Link>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {showDirections && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${first.lat},${first.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-[#5B4FCF] font-medium mt-2"
        >
          Deschide în Google Maps pentru direcții →
        </a>
      )}
    </div>
  )
}
