import { ImageResponse } from 'next/og'

// Runtime edge: în runtime-ul Node, @vercel/og nu-și poate încărca fontul
// implicit („Invalid URL" la build). Buildul avertizează că pagina nu mai e
// generată static — e o notă informativă, imaginea se cachează oricum la CDN.
export const runtime = 'edge'
export const alt = 'Pocoloco — locuri reale, de la oameni reali'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Imaginea implicită pentru share, folosită acolo unde nu există o poză
 * proprie (homepage, căutare, pagini statice). Textul e intenționat fără
 * diacritice: fontul implicit al generatorului nu le acoperă garantat.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8440A 0%, #5B4FCF 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -3 }}>pocoloco</div>
        <div style={{ fontSize: 40, marginTop: 16, opacity: 0.92 }}>
          Locuri reale, de la oameni reali.
        </div>
        <div style={{ fontSize: 26, marginTop: 48, opacity: 0.75 }}>pocoloco.travel</div>
      </div>
    ),
    size
  )
}
