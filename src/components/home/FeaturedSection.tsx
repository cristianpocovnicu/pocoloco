'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const FEATURED = [
  { id: '1', title: '7 zile în Ardeal, fără hotel', type: 'Calatorie', emoji: '🏰', gradient: 'from-purple-700 to-blue-600', author: 'Mihai Alexe', guide: true },
  { id: '2', title: 'New York iarna — 5 zile pe jos', type: 'Calatorie', emoji: '🗽', gradient: 'from-amber-500 to-red-500', author: 'Mihai Alexe', guide: true },
  { id: '3', title: 'Grecia cu barca — 12 zile', type: 'Calatorie', emoji: '⛵', gradient: 'from-emerald-500 to-sky-500', author: 'Mihai Alexe', guide: true },
  { id: '4', title: 'Scandinavia fără plan fix', type: 'Calatorie', emoji: '🌲', gradient: 'from-emerald-700 to-teal-500', author: 'Radu D.', guide: false },
  { id: '5', title: 'Maroc în 10 zile', type: 'Calatorie', emoji: '🕌', gradient: 'from-orange-500 to-yellow-600', author: 'Ana I.', guide: false },
  { id: '6', title: 'Japonia — primăvara în Tokyo', type: 'Calatorie', emoji: '🌸', gradient: 'from-pink-400 to-rose-600', author: 'Dan M.', guide: false },
]

export default function FeaturedSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.offsetWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Recomandate</h2>
        <div className="flex items-center gap-2">
          {/* Săgeți — doar pe desktop */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30 hover:bg-[#F8F7F5] transition-colors"
            >
              <ChevronLeft size={16} className="text-[#6B6B6B]" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.08)] flex items-center justify-center disabled:opacity-30 hover:bg-[#F8F7F5] transition-colors"
            >
              <ChevronRight size={16} className="text-[#6B6B6B]" />
            </button>
          </div>
          <Link href="/search" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide"
      >
        {FEATURED.map((item) => (
          <Link
            key={item.id}
            href={`/trip/${item.id}`}
            className="min-w-[240px] md:min-w-[calc(33%-8px)] h-[150px] md:h-[160px] rounded-2xl overflow-hidden relative flex-shrink-0 block"
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
                <div className="w-5 h-5 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[9px] font-bold text-white">
                  {item.author.slice(0,2).toUpperCase()}
                </div>
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
