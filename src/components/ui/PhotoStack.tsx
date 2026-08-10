import CoverImage from '@/components/ui/CoverImage'

/**
 * Pozele unei povești: prima mare, restul dedesubt.
 *
 * Poza e motivul pentru care cineva se oprește din derulat, iar
 * miniaturile de 48px o ascundeau. Așa că prima ia toată lățimea, iar
 * restul se strâng într-un rând de pătrate, cu „+N" pe ultimul când sunt
 * mai multe decât încap.
 *
 * Aspectul e mai scund pe telefon (3:2) decât pe desktop (16:10): pe
 * 375px o poză 16:10 ar împinge tot textul sub linia de plutire. Cu zece
 * opriri una sub alta, diferența înseamnă un ecran de derulat sau trei.
 *
 * Toate trec prin `CoverImage`, adică `next/image`: lazy implicit, srcset
 * generat, iar `sizes` spune browserului cât de mare e de fapt locul —
 * fără el ar descărca fișierul original.
 *
 * A trăit în FeedCard până la redesignul paginii călătoriei, când a
 * devenit a doua ei casă.
 */
export default function PhotoStack({
  images,
  sizes = '(max-width: 768px) 100vw, 680px',
  tileSizes = '(max-width: 768px) 33vw, 226px',
  className = 'mt-1',
}: {
  images: string[]
  /** cât loc ocupă poza mare, pentru srcset */
  sizes?: string
  /** cât loc ocupă un pătrat din rândul de jos */
  tileSizes?: string
  className?: string
}) {
  const [hero, ...rest] = images
  if (!hero) return null

  // peste 3 rămase, ultimul pătrat devine „încă N" — două se văd întregi
  const tiles = rest.length > 3 ? rest.slice(0, 3) : rest
  const hidden = rest.length > 3 ? rest.length - 2 : 0

  return (
    <div className={className}>
      <div className="relative w-full aspect-[3/2] md:aspect-[16/10] bg-[#F8F7F5]">
        <CoverImage src={hero} sizes={sizes} />
      </div>

      {/* exact două poze: a doua ia toată lățimea, la jumătate de înălțime */}
      {rest.length === 1 && (
        <div className="relative w-full aspect-[3/1] md:aspect-[16/5] bg-[#F8F7F5] mt-1">
          <CoverImage src={rest[0]} sizes={sizes} />
        </div>
      )}

      {rest.length > 1 && (
        <div className="grid grid-cols-3 gap-1 mt-1">
          {tiles.map((image, index) => (
            <div key={image} className="relative aspect-square bg-[#F8F7F5]">
              <CoverImage src={image} sizes={tileSizes} />
              {hidden > 0 && index === tiles.length - 1 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="font-outfit text-[18px] font-bold text-white">+{hidden}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
