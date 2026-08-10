'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Images, Loader2, MapPin } from 'lucide-react'
import DynamicMap, { type MapMarker } from '@/components/map/DynamicMap'
import {
  clusterPhotos, formatClusterPeriod, photoCountLabel,
  type MemoryCluster,
} from '@/lib/memory-map'
import {
  MAX_PHOTOS, isImageFile, localThumbnail, pickDirectoryImages, scanPhotos,
  supportsDirectoryPicker, type ScannedPhoto,
} from '@/lib/photo-exif'
import { reverseGeocodeArea } from '@/lib/places'

/** Câte miniaturi ținem per grup. Trei ajung ca să recunoști locul. */
const THUMBS_PER_CLUSTER = 3

const MAP_HEIGHT = 240

type Phase = 'idle' | 'scanning' | 'done'

/**
 * Harta amintirilor: pozele de pe telefon, citite local, așezate pe hartă.
 *
 * Tot ce se întâmplă aici stă în browser. Fișierele nu urcă nicăieri, iar
 * rezultatul nu se salvează: la ieșirea din pagină dispare. E o alegere,
 * nu o lipsă — o hartă din pozele cuiva e un jurnal întreg, iar pentru
 * păstrarea lui vrem un acord explicit, nu o bifă tăcută (v2).
 *
 * Puntea spre produs e butonul de pe fiecare grup: din centrul lui aflăm
 * numele zonei și deschidem „Povestește" cu el în căutare. Pozele nu
 * călătoresc cu butonul — omul le alege acolo, ca de obicei.
 */
export default function MemoryMap() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [scanned, setScanned] = useState<ScannedPhoto[]>([])
  const [clusters, setClusters] = useState<MemoryCluster[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string[]>>({})
  const [overflow, setOverflow] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  /** aflat abia în browser, ca serverul și clientul să randeze la fel */
  const [canPickFolder, setCanPickFolder] = useState(false)

  const stopped = useRef(false)
  const urls = useRef<string[]>([])
  /** miniaturile se fac una câte una; pagina poate pleca între timp */
  const alive = useRef(true)

  useEffect(() => setCanPickFolder(supportsDirectoryPicker()), [])

  /** Object URL-urile miniaturilor rămân alocate până le eliberăm noi. */
  const releaseThumbs = () => {
    urls.current.forEach(url => URL.revokeObjectURL(url))
    urls.current = []
  }

  useEffect(() => () => { alive.current = false; releaseThumbs() }, [])

  const run = async (files: File[]) => {
    const images = files.filter(isImageFile)
    if (images.length === 0) return

    releaseThumbs()
    stopped.current = false
    setThumbs({})
    setClusters([])
    setScanned([])
    setOverflow(Math.max(0, images.length - MAX_PHOTOS))

    const picked = images.slice(0, MAX_PHOTOS)
    setProgress({ done: 0, total: picked.length })
    setPhase('scanning')

    const results = await scanPhotos(picked, {
      onProgress: (done, total) => setProgress({ done, total }),
      shouldStop: () => stopped.current,
    })

    const located = results.filter(photo => photo.lat !== null && photo.lng !== null)
    const groups = clusterPhotos(located.map(photo => ({
      id: photo.id,
      lat: photo.lat as number,
      lng: photo.lng as number,
      takenAt: photo.takenAt,
    })))

    setScanned(results)
    setClusters(groups)
    setPhase('done')

    // miniaturile vin după hartă: harta e informația, ele sunt decorul
    const byId = new Map(results.map(photo => [photo.id, photo]))
    for (const group of groups) {
      const made: string[] = []
      for (const id of group.photoIds.slice(0, THUMBS_PER_CLUSTER)) {
        const photo = byId.get(id)
        if (!photo) continue
        const url = await localThumbnail(photo.file)
        if (!alive.current) {
          // plecat din pagină între două miniaturi: ce s-a creat se eliberează aici
          if (url) URL.revokeObjectURL(url)
          made.forEach(done => URL.revokeObjectURL(done))
          return
        }
        if (url) { made.push(url); urls.current.push(url) }
      }
      if (made.length > 0) setThumbs(prev => ({ ...prev, [group.id]: made }))
    }
  }

  const onFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    // golim câmpul: altfel aceeași selecție a doua oară nu mai declanșează nimic
    event.target.value = ''
    run(files)
  }

  const onFolder = async () => {
    const files = await pickDirectoryImages()
    if (files && files.length > 0) run(files)
  }

  /** Din centrul grupului, un nume de zonă; cu el deschidem „Povestește". */
  const tellAbout = async (cluster: MemoryCluster) => {
    setBusy(cluster.id)
    const area = await reverseGeocodeArea(cluster.lat, cluster.lng)
    // fără nume (cheie lipsă, ocean, API neactivat) fluxul se deschide gol
    router.push(area ? `/add-experience?q=${encodeURIComponent(area.name)}` : '/add-experience')
  }

  const located = scanned.filter(photo => photo.lat !== null)
  const markers: MapMarker[] = clusters.map(cluster => ({
    id: cluster.id,
    lat: cluster.lat,
    lng: cluster.lng,
    name: formatClusterPeriod(cluster.from, cluster.to) || 'Fără dată',
    subtitle: photoCountLabel(cluster.photoIds.length),
    thumbnails: thumbs[cluster.id],
  }))

  return (
    <div className="px-5 pt-4">
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[16px]">📍</span>
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Harta amintirilor</h2>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="hidden"
        />

        {phase === 'idle' && (
          <>
            <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-1 mb-3.5">
              Selectează pozele din călătorii — poți lua sute deodată. Nu le încărcăm
              nicăieri: citim doar locul și data, direct pe dispozitivul tău.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full bg-[#E8440A] text-white font-outfit text-[14px] font-semibold px-5 py-3 rounded-full flex items-center justify-center gap-2"
            >
              <Images size={16} /> Descoperă pe unde ai fost
            </button>
            {canPickFolder && (
              <button
                type="button"
                onClick={onFolder}
                className="w-full mt-2 text-[12px] text-[#5B4FCF] font-medium py-2 flex items-center justify-center gap-1.5"
              >
                <FolderOpen size={13} /> ...sau alege un folder întreg
              </button>
            )}
          </>
        )}

        {phase === 'scanning' && (
          <div className="mt-3">
            <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E8440A] transition-all duration-200"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[12px] text-[#6B6B6B] flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                {progress.done} din {progress.total} poze citite
              </p>
              <button
                type="button"
                onClick={() => { stopped.current = true }}
                className="text-[12px] text-[#9B9B9B] font-medium"
              >
                Oprește
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-2">
            <p className="text-[13px] text-[#0F0F0F]">
              Am găsit locații în <strong>{located.length}</strong> din {scanned.length} poze
            </p>
            {located.length < scanned.length && (
              <p className="text-[11px] text-[#9B9B9B] leading-relaxed mt-0.5">
                Pozele salvate din WhatsApp sau screenshot-urile nu păstrează locația.
              </p>
            )}
            {overflow > 0 && (
              <p className="text-[11px] text-[#9B9B9B] leading-relaxed mt-1">
                Am citit primele {MAX_PHOTOS}. Restul de {overflow} le poți da într-o rundă următoare.
              </p>
            )}

            {clusters.length > 0 ? (
              <>
                <div className="mt-3">
                  <DynamicMap markers={markers} height={MAP_HEIGHT} zoom={5} fitMaxZoom={9} />
                </div>
                <p className="text-[11px] text-[#9B9B9B] mt-1.5">
                  Harta există doar cât ești pe pagină — nimic nu se salvează încă.
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  {clusters.map(cluster => (
                    <ClusterRow
                      key={cluster.id}
                      cluster={cluster}
                      thumbnails={thumbs[cluster.id] || []}
                      busy={busy === cluster.id}
                      onTell={() => tellAbout(cluster)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-2">
                Niciuna dintre pozele astea nu are locul salvat în ea. Încearcă cu poze
                făcute direct cu telefonul, cu localizarea pornită.
              </p>
            )}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full mt-3 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[13px] font-medium py-2.5 rounded-full"
            >
              Alege alte poze
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ClusterRow({
  cluster, thumbnails, busy, onTell,
}: {
  cluster: MemoryCluster
  thumbnails: string[]
  busy: boolean
  onTell: () => void
}) {
  const period = formatClusterPeriod(cluster.from, cluster.to)

  return (
    // pe mobil butonul coboară pe rândul lui: alături de miniaturi și de
    // perioadă n-ar mai rămâne loc decât pentru trei puncte de suspensie
    <div className="border border-[rgba(0,0,0,0.08)] rounded-xl p-2.5 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
      {thumbnails.length > 0 ? (
        <div className="flex -space-x-3 flex-shrink-0">
          {thumbnails.map(src => (
            // miniaturi locale (object URL): next/image n-are ce optimiza aici
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="w-11 h-11 rounded-lg object-cover border-2 border-white bg-[#F0EDE8]"
            />
          ))}
        </div>
      ) : (
        <div className="w-11 h-11 rounded-lg bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-[#E8440A]" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] truncate">
          {period || 'Fără dată'}
        </p>
        <p className="text-[11px] text-[#9B9B9B]">
          {photoCountLabel(cluster.photoIds.length)}
        </p>
      </div>

      <button
        type="button"
        onClick={onTell}
        disabled={busy}
        className="text-[11px] bg-[#FFF0EB] text-[#E8440A] font-medium px-3 py-2 rounded-lg flex-shrink-0 flex items-center justify-center gap-1 disabled:opacity-60 w-full sm:w-auto sm:ml-auto"
      >
        {busy && <Loader2 size={11} className="animate-spin" />}
        Povestește despre asta →
      </button>
    </div>
  )
}
