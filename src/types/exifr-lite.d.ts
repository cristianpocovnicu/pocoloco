/**
 * Tipurile pentru bundle-ul „lite" al lui exifr.
 *
 * Pachetul își declară tipurile doar pentru intrarea principală
 * (`exifr` → dist/full), iar noi importăm explicit `lite`: JPEG + HEIC,
 * TIFF/EXIF cu dicționarul GPS, la 12 kB gzip în loc de 22. Restul —
 * PNG, TIFF brut, IPTC, ICC — n-are ce căuta într-un flux de poze de
 * telefon.
 */
declare module 'exifr/dist/lite.esm.mjs' {
  type ExifrInput = Blob | File | ArrayBuffer | Uint8Array

  export function parse(
    input: ExifrInput,
    options?: unknown
  ): Promise<Record<string, unknown> | undefined>

  /** Miniatura din EXIF, ca object URL. Doar în browser. */
  export function thumbnailUrl(input: ExifrInput): Promise<string | undefined>

  const exifr: {
    parse: typeof parse
    thumbnailUrl: typeof thumbnailUrl
  }

  export default exifr
}
