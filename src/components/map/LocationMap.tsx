'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
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
  /** 'want' desenează un pin violet, mai mic — locurile pe listă, nu bifate */
  variant?: 'visited' | 'want'
  /**
   * Miniaturi arătate în popup. Pe „Harta amintirilor" sunt object URL-uri
   * locale, deci nu trec prin next/image: n-au ce optimiza, iar loader-ul
   * ar încerca să le ceară de pe server.
   */
  thumbnails?: string[]
}

type Props = {
  markers: MapMarker[]
  /** centrul inițial; fără el, harta încadrează toate markerele */
  center?: [number, number]
  zoom?: number
  height?: number
  /** sub hartă, link către direcții */
  showDirections?: boolean
  /** click pe fundalul hărții (nu pe un pin) — ex. deschide harta mare */
  onMapClick?: () => void
  scrollWheelZoom?: boolean
  /** cât de aproape are voie să intre încadrarea automată */
  fitMaxZoom?: number
}

/**
 * Pin în culorile brandului, desenat ca SVG inline — Leaflet altfel cere
 * fișiere PNG servite din /public, iar cele implicite dau 404 în bundle.
 */
const pinIcon = (color: string, scale = 1) => {
  const w = Math.round(26 * scale)
  const h = Math.round(34 * scale)
  return L.divIcon({
    className: 'pocoloco-pin',
    html: `<svg width="${w}" height="${h}" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 11.6 20 12.1 20.5.5.4 1.3.4 1.8 0C14.4 33 26 22.2 26 13 26 5.8 20.2 0 13 0z" fill="${color}"/>
      <circle cx="13" cy="13" r="5" fill="white"/>
    </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -(h - 2)],
  })
}

const ICONS = {
  visited: pinIcon('#E8440A'),
  want: pinIcon('#5B4FCF', 0.7),
}

/** Leaflet nu propagă clickul de pe un marker la hartă, deci cele două nu se bat cap în cap. */
function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick })
  return null
}

/** Încadrează harta pe toate markerele, când nu primim un centru explicit. */
function FitBounds({ markers, maxZoom = 13 }: { markers: MapMarker[]; maxZoom?: number }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length < 2) return
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [30, 30], maxZoom })
  }, [markers, map, maxZoom])

  return null
}

export default function LocationMap({
  markers,
  center,
  zoom = 13,
  height = 200,
  showDirections,
  onMapClick,
  scrollWheelZoom = false,
  fitMaxZoom,
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
          scrollWheelZoom={scrollWheelZoom}
          style={{ height: '100%', width: '100%', cursor: onMapClick ? 'pointer' : undefined }}
        >
          {/* OpenStreetMap: fără cheie, fără cost — atribuirea e obligatorie */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <FitBounds markers={markers} maxZoom={fitMaxZoom} />
          {onMapClick && <MapClickHandler onClick={onMapClick} />}

          {markers.map(marker => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={ICONS[marker.variant || 'visited']}
            >
              <Popup>
                <div className="font-sans">
                  <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] mb-0.5">{marker.name}</p>
                  {marker.subtitle && <p className="text-[11px] text-[#9B9B9B] mb-1">{marker.subtitle}</p>}
                  {marker.thumbnails && marker.thumbnails.length > 0 && (
                    <div className="flex gap-1 mb-1.5">
                      {marker.thumbnails.map(src => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={src}
                          src={src}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-[#F0EDE8]"
                        />
                      ))}
                    </div>
                  )}
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
