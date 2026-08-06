'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const FOLLOWING = [
  { id: '1', type: 'Experienta', emoji: '🏰', bg: 'bg-[#FFF0EB]', user: 'MP', userName: 'Maria Popescu', title: 'Castelul Bran — cel mai impresionant loc din România', location: 'Bran, Brașov' },
  { id: '2', type: 'Experienta', emoji: '⛵', bg: 'bg-[#EEEDFB]', user: 'MA', userName: 'Mihai Alexe', title: 'Navigat fără motor o săptămână întreagă', location: 'Grecia' },
  { id: '3', type: 'Calatorie', emoji: '🏔️', bg: 'bg-[#ECFDF5]', user: 'RD', userName: 'Radu Dumitrescu', title: 'Transfăgărășan — drumul de vis al României', location: 'Argeș' },
  { id: '4', type: 'Experienta', emoji: '🌊', bg: 'bg-[#EFF6FF]', user: 'AI', userName: 'Ana Ionescu', title: 'Vama Veche în septembrie — perfect fără turiști', location: 'Constanța' },
  { id: '5', type: 'Calatorie', emoji: '🏛️', bg: 'bg-[#FFFBEB]', user: 'DM', userName: 'Dan Marin', title: 'Roma în 4 zile — tot ce trebuie să știi', location: 'Roma, Italia' },
]

export default function FollowingSection() {
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
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Urmaresc</h2>
        <div className="flex items-center gap-2">
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
          <Link href="/following" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
      >
        {FOLLOWING.map((item) => (
          <Link
            key={item.id}
            href={`/location/${item.id}`}
            className="min-w-[220px] md:min-w-[calc(33%-8px)] bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex-shrink-0 block"
          >
            <div className={`${item.bg} h-[110px] flex items-center justify-center text-4xl relative`}>
              <span>{item.emoji}</span>
              <span className="absolute top-2 left-2 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase px-2 py-0.5 rounded-full">
                {item.type}
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-[#FFF0EB] flex items-center justify-center text-[9px] font-bold text-[#E8440A]">{item.user}</div>
                <span className="text-[12px] text-[#6B6B6B] font-medium">{item.userName}</span>
              </div>
              <p className="text-[13px] font-outfit font-semibold text-[#0F0F0F] leading-tight mb-1">{item.title}</p>
              <p className="text-[11px] text-[#9B9B9B]">📍 {item.location}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
