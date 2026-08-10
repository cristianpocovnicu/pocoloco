/**
 * Pozele cu GPS, grupate în „locuri vizitate".
 *
 * Funcții pure: primesc coordonate și date, întorc grupuri. Nu știu nimic
 * despre fișiere, EXIF sau React — de asta se pot testa pe un set sintetic
 * (vezi raportul rundei) fără nicio poză adevărată.
 */

import { MONTHS_RO } from './period'

export type PhotoPoint = {
  /** id local, stabil doar cât ține sesiunea */
  id: string
  lat: number
  lng: number
  /** milisecunde; null când poza n-are nici EXIF, nici dată de fișier */
  takenAt: number | null
}

export type MemoryCluster = {
  id: string
  /** centrul geografic al pozelor din grup */
  lat: number
  lng: number
  photoIds: string[]
  /** prima și ultima dată cunoscută din grup; null dacă niciuna n-are dată */
  from: number | null
  to: number | null
}

/**
 * Cele două praguri. Sunt aici, sus, tocmai ca să se poată muta după ce
 * vedem seturi reale de poze.
 *
 * 30 km: cât ține o zi de umblat prin aceeași zonă — un oraș cu
 * împrejurimile lui. 14 zile: două vizite în același loc, la două luni
 * distanță, sunt două amintiri, nu una.
 */
export const CLUSTER_RADIUS_KM = 30
export const CLUSTER_GAP_DAYS = 14

/**
 * Cât de mare are voie să crească un grup, măsurat de la centrul lui.
 *
 * Fără plafon, un drum lung cu opriri dese s-ar lipi într-un singur grup
 * cât toată țara: fiecare poză o cheamă pe următoarea, la 20 km distanță,
 * până în capătul hărții. Cu plafonul, lanțul se rupe când zona devine
 * mai mare decât o zi de umblat.
 */
export const CLUSTER_MAX_SPREAD_KM = CLUSTER_RADIUS_KM * 2

const DAY_MS = 24 * 60 * 60 * 1000
const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Distanța pe sferă, în kilometri. */
export function haversineKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cât de departe e un moment de intervalul unui grup (0 dacă e înăuntru). */
function gapMs(cluster: MemoryCluster, at: number): number {
  if (cluster.from === null || cluster.to === null) return 0
  if (at < cluster.from) return cluster.from - at
  if (at > cluster.to) return at - cluster.to
  return 0
}

type Accumulator = MemoryCluster & {
  sumLat: number
  sumLng: number
  /** membrii, ca să măsurăm distanța până la cel mai apropiat */
  points: PhotoPoint[]
}

function absorb(cluster: Accumulator, point: PhotoPoint): void {
  cluster.sumLat += point.lat
  cluster.sumLng += point.lng
  cluster.points.push(point)
  cluster.photoIds.push(point.id)
  cluster.lat = cluster.sumLat / cluster.photoIds.length
  cluster.lng = cluster.sumLng / cluster.photoIds.length

  if (point.takenAt === null) return
  cluster.from = cluster.from === null ? point.takenAt : Math.min(cluster.from, point.takenAt)
  cluster.to = cluster.to === null ? point.takenAt : Math.max(cluster.to, point.takenAt)
}

/**
 * Grupează pozele: sub `radiusKm` de **cea mai apropiată** poză din grup
 * și sub `gapDays` de intervalul lui.
 *
 * Distanța se măsoară până la cel mai apropiat membru, nu până la centru,
 * pentru că așa se comportă o zi de umblat: pozele se înlănțuie una după
 * alta prin oraș, iar centrul rămâne în urmă. Ce ar strica lanțul —
 * creșterea la nesfârșit de-a lungul unui drum — e oprit de `maxSpreadKm`,
 * plafonul măsurat față de centru.
 *
 * Pozele fără dată se agață doar după distanță, la sfârșit: n-avem cum să
 * le așezăm în timp, dar locul lor e cunoscut.
 *
 * Longitudinea se mediază direct, deci un grup exact peste meridianul 180
 * ar ieși în partea greșită a lumii. Nu compensăm: n-avem utilizatori în
 * Fiji, iar corecția ar complica o funcție care altfel se citește dintr-o
 * privire.
 */
export function clusterPhotos(
  points: PhotoPoint[],
  options?: { radiusKm?: number; gapDays?: number; maxSpreadKm?: number }
): MemoryCluster[] {
  const radiusKm = options?.radiusKm ?? CLUSTER_RADIUS_KM
  const gapLimit = (options?.gapDays ?? CLUSTER_GAP_DAYS) * DAY_MS
  const maxSpreadKm = options?.maxSpreadKm ?? CLUSTER_MAX_SPREAD_KM

  const dated = points.filter(p => p.takenAt !== null)
    .sort((a, b) => (a.takenAt as number) - (b.takenAt as number))
  const undated = points.filter(p => p.takenAt === null)

  const clusters: Accumulator[] = []

  const attach = (point: PhotoPoint, checkTime: boolean) => {
    let best: Accumulator | null = null
    let bestDistance = Infinity

    for (const cluster of clusters) {
      if (checkTime && point.takenAt !== null && gapMs(cluster, point.takenAt) > gapLimit) continue

      let nearest = Infinity
      for (const member of cluster.points) {
        const step = haversineKm(member.lat, member.lng, point.lat, point.lng)
        if (step < nearest) nearest = step
        if (nearest === 0) break
      }
      if (nearest > radiusKm || nearest >= bestDistance) continue
      // plafonul: grupul n-are voie să se întindă cât un drum întreg
      if (haversineKm(cluster.lat, cluster.lng, point.lat, point.lng) > maxSpreadKm) continue

      best = cluster
      bestDistance = nearest
    }

    if (best) {
      absorb(best, point)
      return
    }

    const fresh: Accumulator = {
      id: `cluster-${clusters.length}`,
      lat: point.lat,
      lng: point.lng,
      sumLat: point.lat,
      sumLng: point.lng,
      points: [point],
      photoIds: [point.id],
      from: point.takenAt,
      to: point.takenAt,
    }
    clusters.push(fresh)
  }

  for (const point of dated) attach(point, true)
  for (const point of undated) attach(point, false)

  // cronologic: lista de sub hartă se citește ca un jurnal
  return clusters
    .map(({ sumLat: _sumLat, sumLng: _sumLng, points: _points, ...cluster }) => cluster)
    .sort((a, b) => {
      if (a.from === null) return 1
      if (b.from === null) return -1
      return a.from - b.from
    })
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Perioada unui grup, în cuvinte: „Iunie 2025", „Iunie – iulie 2025",
 * „Decembrie 2024 – ianuarie 2025".
 */
export function formatClusterPeriod(from: number | null, to: number | null): string | null {
  if (from === null) return null

  const start = new Date(from)
  const end = new Date(to ?? from)
  if (Number.isNaN(start.getTime())) return null

  const startLabel = `${MONTHS_RO[start.getMonth()]} ${start.getFullYear()}`
  const endLabel = `${MONTHS_RO[end.getMonth()]} ${end.getFullYear()}`

  if (startLabel === endLabel) return capitalize(startLabel)
  if (start.getFullYear() === end.getFullYear()) {
    return capitalize(`${MONTHS_RO[start.getMonth()]} – ${MONTHS_RO[end.getMonth()]} ${end.getFullYear()}`)
  }
  return capitalize(`${startLabel} – ${endLabel}`)
}

export function photoCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'poză' : 'poze'}`
}
