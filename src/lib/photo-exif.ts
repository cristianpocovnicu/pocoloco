/**
 * Citirea locului și a datei din pozele alese de utilizator.
 *
 * Tot ce e aici se întâmplă în browser, pe fișierele de pe dispozitiv.
 * Nimic nu pleacă spre server: exifr citește doar primii kilobytes din
 * fiecare fișier (antetul EXIF), nu imaginea întreagă — de asta o mie de
 * poze se scanează în secunde, nu în minute.
 *
 * Biblioteca se importă dinamic, la prima scanare. Pe profil intră cine
 * n-o folosește niciodată; n-are de ce s-o descarce.
 */

/** Peste atâtea fișiere ne oprim politicos: memoria browserului are limite. */
export const MAX_PHOTOS = 2000

/** Câte fișiere citim odată, între două respirări ale interfeței. */
const BATCH_SIZE = 8

/** Extensiile pe care le luăm dintr-un folder (unde `type` lipsește des). */
const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.avif', '.tif', '.tiff',
]

/** Formatele pe care orice browser le poate desena fără ajutor. */
const RENDERABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export type ScannedPhoto = {
  id: string
  file: File
  lat: number | null
  lng: number | null
  /** milisecunde; din EXIF dacă există, altfel data fișierului */
  takenAt: number | null
}

export function isImageFile(file: { name: string; type?: string }): boolean {
  if (file.type && file.type.startsWith('image/')) return true
  const name = file.name.toLowerCase()
  return IMAGE_EXTENSIONS.some(ext => name.endsWith(ext))
}

let exifrPromise: Promise<typeof import('exifr/dist/lite.esm.mjs')> | null = null

function loadExifr() {
  if (!exifrPromise) exifrPromise = import('exifr/dist/lite.esm.mjs')
  return exifrPromise
}

/**
 * Ce cerem din fiecare fișier: blocul GPS și data fotografierii.
 *
 * `ifd1` (miniatura) și `interop` sunt scoase explicit — sunt segmente
 * întregi citite degeaba. Din `exif` luăm doar cele două date posibile,
 * nu tot ce a scris producătorul telefonului acolo.
 */
const PARSE_OPTIONS = {
  tiff: true,
  ifd1: false,
  interop: false,
  exif: { pick: ['DateTimeOriginal', 'CreateDate'] },
  gps: true,
  xmp: false,
  mergeOutput: true,
}

function asTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isNaN(ms) ? null : ms
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

function asCoordinate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export type PhotoExif = { lat: number | null; lng: number | null; takenAt: number | null }

/**
 * Locul și data dintr-un singur fișier.
 *
 * `fallbackTime` e data fișierului — o aproximație onestă, nu un adevăr: o
 * poză copiată de pe telefon poate purta data copierii. O folosim doar când
 * EXIF-ul tace, pentru că o grupare aproximativă e mai bună decât niciuna.
 *
 * Nu aruncă niciodată: un fișier stricat sau un format necunoscut se
 * numără la total, dar fără loc.
 */
export async function readPhotoExif(
  input: Blob | Uint8Array,
  fallbackTime: number | null
): Promise<PhotoExif> {
  try {
    const exifr = await loadExifr()
    const output = await exifr.parse(input, PARSE_OPTIONS)
    if (!output) return { lat: null, lng: null, takenAt: fallbackTime }

    return {
      lat: asCoordinate(output.latitude),
      lng: asCoordinate(output.longitude),
      takenAt: asTimestamp(output.DateTimeOriginal)
        ?? asTimestamp(output.CreateDate)
        ?? fallbackTime,
    }
  } catch {
    return { lat: null, lng: null, takenAt: fallbackTime }
  }
}

async function readOne(file: File, id: string): Promise<ScannedPhoto> {
  const exif = await readPhotoExif(file, file.lastModified || null)
  return { id, file, ...exif }
}

/**
 * Citește un teanc de fișiere, în valuri, cu raportare pe parcurs.
 *
 * Între valuri cedăm firul de execuție (`setTimeout 0`): fără asta, la 500
 * de fișiere bara de progres ar apărea abia la sfârșit, iar pagina ar
 * părea blocată.
 */
export async function scanPhotos(
  files: File[],
  handlers: {
    onProgress?: (done: number, total: number) => void
    shouldStop?: () => boolean
  } = {}
): Promise<ScannedPhoto[]> {
  const results: ScannedPhoto[] = []
  const total = files.length

  for (let start = 0; start < total; start += BATCH_SIZE) {
    if (handlers.shouldStop?.()) break

    const batch = files.slice(start, start + BATCH_SIZE)
    const read = await Promise.all(batch.map((file, i) => readOne(file, `photo-${start + i}`)))
    results.push(...read)

    handlers.onProgress?.(results.length, total)
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return results
}

/**
 * O miniatură locală pentru poza dată.
 *
 * Întâi cea din EXIF: are câțiva kilobytes și e deja decodată la
 * dimensiunea potrivită. Un object URL peste fișierul întreg ar obliga
 * browserul să desfacă în memorie o poză de 4 MB ca s-o arate la 56 de
 * pixeli — de zeci de ori, pe un telefon.
 *
 * URL-ul întors trebuie eliberat de apelant (`URL.revokeObjectURL`).
 */
export async function localThumbnail(file: File): Promise<string | null> {
  try {
    const exifr = await loadExifr()
    const url = await exifr.thumbnailUrl(file)
    if (url) return url
  } catch {
    // fără miniatură în EXIF — încercăm fișierul întreg mai jos
  }

  if (RENDERABLE.includes(file.type)) return URL.createObjectURL(file)
  return null
}

// ---- alegerea unui folder întreg (File System Access API) ----

type DirectoryHandle = {
  values: () => AsyncIterable<DirectoryHandle | FileHandle>
  kind: 'directory'
  name: string
}

type FileHandle = {
  kind: 'file'
  name: string
  getFile: () => Promise<File>
}

type PickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>
}

/** Chrome și Edge pe desktop. Safari și Firefox nu au API-ul — și e ok. */
export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as PickerWindow).showDirectoryPicker === 'function'
}

/** Cât de adânc intrăm în subfoldere. Pozele stau în „2024/vara/…", nu mai jos. */
const MAX_DEPTH = 6

async function collect(dir: DirectoryHandle, into: File[], depth: number): Promise<void> {
  if (depth > MAX_DEPTH || into.length >= MAX_PHOTOS) return

  for await (const entry of dir.values()) {
    if (into.length >= MAX_PHOTOS) return
    if (entry.kind === 'directory') {
      await collect(entry as DirectoryHandle, into, depth + 1)
      continue
    }
    if (!isImageFile(entry)) continue
    into.push(await (entry as FileHandle).getFile())
  }
}

/**
 * Deschide selectorul de folder și adună recursiv imaginile din el.
 * Întoarce `null` dacă omul a închis fereastra.
 */
export async function pickDirectoryImages(): Promise<File[] | null> {
  const picker = (window as PickerWindow).showDirectoryPicker
  if (!picker) return null

  try {
    const dir = await picker()
    const files: File[] = []
    await collect(dir, files, 0)
    return files
  } catch {
    // anulare din fereastra sistemului, sau permisiune refuzată
    return null
  }
}
