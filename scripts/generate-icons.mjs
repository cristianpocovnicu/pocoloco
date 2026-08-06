/**
 * Generează iconițele PWA fără dependențe externe (fără sharp, fără canvas).
 * Scrie un PNG RGB: fundal portocaliu Pocoloco cu un „P" alb, desenat din
 * dreptunghiuri — suficient ca placeholder până la logoul real.
 *
 * Rulare:  node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const ORANGE = [0xe8, 0x44, 0x0a]
const WHITE = [0xff, 0xff, 0xff]

/** Litera „P", în coordonate normalizate (0–1): stem, bara de sus, dreapta, bara din mijloc. */
const GLYPH = [
  [0.32, 0.24, 0.44, 0.78], // stem vertical
  [0.32, 0.24, 0.64, 0.36], // bara de sus
  [0.60, 0.24, 0.72, 0.58], // latura dreaptă a buclei, până la bara din mijloc
  [0.32, 0.46, 0.72, 0.58], // bara din mijloc, care închide bucla
]

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function renderPng(size) {
  // fiecare scanline începe cu un octet de filtru (0 = None)
  const stride = size * 3
  const raw = Buffer.alloc(size * (stride + 1))

  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0

    for (let x = 0; x < size; x++) {
      const nx = x / size
      const ny = y / size
      const inGlyph = GLYPH.some(([x0, y0, x1, y1]) => nx >= x0 && nx < x1 && ny >= y0 && ny < y1)
      const [r, g, b] = inGlyph ? WHITE : ORANGE

      const offset = rowStart + 1 + x * 3
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: truecolor RGB
  ihdr[10] = 0 // compresie
  ihdr[11] = 0 // filtru
  ihdr[12] = 0 // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  { path: join(ROOT, 'public', 'icon-192.png'), size: 192 },
  { path: join(ROOT, 'public', 'icon-512.png'), size: 512 },
  { path: join(ROOT, 'public', 'apple-touch-icon.png'), size: 180 },
  // Next servește src/app/icon.png ca favicon, fără configurare
  { path: join(ROOT, 'src', 'app', 'icon.png'), size: 192 },
]

for (const { path, size } of targets) {
  mkdirSync(dirname(path), { recursive: true })
  const png = renderPng(size)
  writeFileSync(path, png)
  console.log(`${path} — ${size}x${size}, ${(png.length / 1024).toFixed(1)} KB`)
}
