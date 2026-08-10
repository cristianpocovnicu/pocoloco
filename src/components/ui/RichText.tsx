import { Fragment } from 'react'
import { parseInline } from '@/lib/inline-format'

/**
 * Textul scris de om, cu îngroșatul și înclinatul lui.
 *
 * Fără `'use client'`: n-are stare și n-are evenimente, deci merge și în
 * componente de server (pagina experienței), și în cele de client
 * (itinerarul, cardurile de recenzie).
 *
 * Bucățile vin din `parseInline`, ca date; aici doar se aleg etichetele.
 * Textul nu devine niciodată HTML pe drum.
 */
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((piece, index) => {
        const content = piece.italic ? <em>{piece.text}</em> : piece.text
        return (
          <Fragment key={index}>
            {piece.bold ? <strong className="font-semibold text-[#0F0F0F]">{content}</strong> : content}
          </Fragment>
        )
      })}
    </>
  )
}
