'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, LayoutList, Map, Loader2 } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const CHIPS = ['Toate', 'Castele', 'Natură', 'Muzee', 'Restaurante', 'Trasee', 'Orașe']

type Location = {
  id: string
  name: string
  city: string
  country: string
  category: string | null
  score: number
  experience_count: number
  cover_image: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [activeChip, setActiveChip] = useState('Toate')
  const [results, setResults] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = useCallback(async (q: string, cat: string) => {
    setLoading(true)
    const supabase = createClient()
    let req = supabase
      .from('locations')
      .select('id, name, city, country, category, score, experience_count, cover_image')
      .eq('status', 'approved')
      .order('experience_count', { ascending: false })
      .limit(30)

    if (q.trim()) req = req.ilike('name', `%${q.trim()}%`)
    if (cat !== 'Toate') req = req.eq('category', cat)

    const { data } = await req
    setResults(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, activeChip), 300)
    return () => clearTimeout(timer)
  }, [query, activeChip, doSearch])

  // Load all on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('id, name, city, country, category, score, experience_count, cover_image')
        .order('experience_count', { ascending: false })
        .limit(30)
      setResults(data || [])
      setLoading(false)
    }
    loadAll()
  }, [])

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="max-w-[680px] mx-auto">
        <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 pt-4 pb-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-2">
              <Search size={15} className="text-[#9B9B9B] flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#0F0F0F] outline-none placeholder:text-[#9B9B9B]"
                placeholder="Caută locuri..."
                autoFocus
              />
              {loading && <Loader2 size={14} className="animate-spin text-[#9B9B9B] flex-shrink-0" />}
            </div>
            <button className="w-9 h-9 rounded-full bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
              <SlidersHorizontal size={17} className="text-[#5B4FCF]" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CHIPS.map(chip => (
              <button key={chip} onClick={() => setActiveChip(chip)} className={cn('whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-outfit font-medium border transition-all flex-shrink-0', activeChip === chip ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'bg-white text-[#6B6B6B] border-[rgba(0,0,0,0.08)]')}>
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-4">
          {!loading && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-[#9B9B9B]">{results.length} locuri găsite</span>
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">Niciun rezultat</p>
              <p className="text-[13px] text-[#9B9B9B]">Încearcă alt termen de căutare</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {results.map(loc => (
              <Link key={loc.id} href={`/location/${loc.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex hover:border-[rgba(0,0,0,0.15)] transition-colors">
                <div className="w-24 flex-shrink-0 bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center text-4xl">
                  {loc.cover_image
                    ? <img src={loc.cover_image} alt={loc.name} className="w-full h-full object-cover" />
                    : '📍'
                  }
                </div>
                <div className="flex-1 p-3.5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight pr-2">{loc.name}</h3>
                    {loc.score > 0 && <span className="bg-[#E8440A] text-white font-outfit text-[11px] font-bold px-2 py-0.5 rounded-xl flex-shrink-0">{loc.score.toFixed(1)}</span>}
                  </div>
                  <p className="text-[12px] text-[#9B9B9B] mb-1.5">📍 {loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                  <div className="flex items-center justify-between">
                    {loc.category && <span className="text-[10px] font-outfit font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8440A]">{loc.category}</span>}
                    <span className="text-[11px] text-[#9B9B9B]">{loc.experience_count} experiențe</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
