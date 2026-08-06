import Link from 'next/link'

const FEATURED = [
  { id: '1', title: '7 zile în Ardeal, fără hotel', type: 'Calatorie', emoji: '🏰', gradient: 'from-purple-700 to-blue-600', author: 'Mihai Alexe', guide: true },
  { id: '2', title: 'New York iarna — 5 zile pe jos', type: 'Calatorie', emoji: '🗽', gradient: 'from-amber-500 to-red-500', author: 'Mihai Alexe', guide: true },
  { id: '3', title: 'Grecia cu barca — 12 zile', type: 'Calatorie', emoji: '⛵', gradient: 'from-emerald-500 to-sky-500', author: 'Mihai Alexe', guide: true },
]

export default function FeaturedSection() {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Recomandate</h2>
        <Link href="/search" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      {/* Mobile: scroll orizontal / Desktop: grid 3 coloane */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
        {FEATURED.map((item) => (
          <Link
            key={item.id}
            href={`/trip/${item.id}`}
            className="min-w-[240px] md:min-w-0 h-[150px] md:h-[160px] rounded-2xl overflow-hidden relative flex-shrink-0 md:flex-shrink block"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} flex items-center justify-center text-5xl opacity-40`}>
              {item.emoji}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
              {item.type}
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-outfit text-[13px] font-semibold text-white leading-tight mb-1.5">{item.title}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[9px] font-bold text-white">MA</div>
                <span className="text-[11px] text-white/85">{item.author}</span>
                {item.guide && <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">Ghid</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
