'use client'
import { useState } from 'react'
import { Search, SlidersHorizontal, LayoutList, Map } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import SearchListView from '@/components/search/SearchListView'
import SearchMapView from '@/components/search/SearchMapView'
import { cn } from '@/lib/utils'

const CHIPS = ['Toate', 'Castele', 'Natură', 'Muzee', 'Restaurante', 'Trasee', 'Orașe']

export default function SearchPage() {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [query, setQuery] = useState('Bran - Brașov, România')
  const [activeChip, setActiveChip] = useState('Toate')

  return (
    <main className="pb-nav">
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-4 pb-2 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <span className="font-outfit text-xl font-bold text-[#E8440A]">🧭 pocoloco</span>
          <div className="w-8 h-8 rounded-full bg-[#EEEDFB] flex items-center justify-center">🧭</div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-2">
            <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#0F0F0F] outline-none placeholder:text-[#9B9B9B]"
              placeholder="Caută locuri, călătorii..."
            />
          </div>
          <button className="w-9 h-9 rounded-full bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal size={17} className="text-[#5B4FCF]" />
          </button>
        </div>
        <div className="flex bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full p-0.5 mb-3">
          <button onClick={() => setView('list')} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-outfit font-medium transition-all', view === 'list' ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#9B9B9B]')}>
            <LayoutList size={14} /> Listă
          </button>
          <button onClick={() => setView('map')} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-outfit font-medium transition-all', view === 'map' ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#9B9B9B]')}>
            <Map size={14} /> Hartă
          </button>
        </div>
        {view === 'list' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {CHIPS.map(chip => (
              <button key={chip} onClick={() => setActiveChip(chip)} className={cn('whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-outfit font-medium border transition-all flex-shrink-0', activeChip === chip ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]')}>
                {chip}
              </button>
            ))}
          </div>
        )}
      </header>
      {view === 'list' ? <SearchListView /> : <SearchMapView />}
      <BottomNav />
    </main>
  )
}
