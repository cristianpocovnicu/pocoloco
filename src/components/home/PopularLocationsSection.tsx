'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { CATEGORY_ICONS, experienceCountLabel } from '@/lib/utils'
import { fetchLocationCovers } from '@/lib/covers'
import CoverImage from '@/components/ui/CoverImage'

type PopularLocation = {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  score: number | null
  experience_count: number | null
  cover_image: string | null
}

export default function PopularLocationsSection() {
  const [locations, setLocations] = useState<PopularLocation[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('id, name, city, country, category, score, experience_count, cover_image')
        .eq('status', 'approved')
        .order('experience_count', { ascending: false })
        .order('score', { ascending: false })
        .limit(6)

      const rows = (data || []) as PopularLocation[]
      setLocations(rows)

      // pentru cardurile fără cover, luăm prima poză din experiențe
      const missing = rows.filter(l => !l.cover_image).map(l => l.id)
      if (missing.length > 0) setCovers(await fetchLocationCovers(supabase, missing))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <section className="mb-7">
      <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F] mb-3">Locații populare</h2>
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#E8440A]" />
      </div>
    </section>
  )

  if (locations.length === 0) return null

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Locații populare</h2>
        <Link href="/search" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {locations.map(loc => (
          <Link
            key={loc.id}
            href={`/location/${loc.id}`}
            className="group bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:border-[rgba(232,68,10,0.35)] hover:shadow-sm transition-all"
          >
            <div className="h-24 bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center relative">
              {loc.cover_image || covers[loc.id]
                ? <CoverImage src={(loc.cover_image || covers[loc.id]) as string} sizes="(max-width: 768px) 50vw, 340px" />
                : <span className="text-3xl opacity-70">{CATEGORY_ICONS[loc.category || ''] || '📍'}</span>}
              {(loc.score || 0) > 0 && (
                <span className="absolute top-2 right-2 bg-[#E8440A] text-white font-outfit text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                  {loc.score?.toFixed(1)}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <h3 className="font-outfit text-[13px] font-semibold text-[#0F0F0F] leading-tight truncate">{loc.name}</h3>
              <p className="text-[11px] text-[#9B9B9B] truncate">
                {loc.city || loc.country || 'Locație'}
              </p>
              {/* săgeata spune „se deschide", fără să ceară un rând în plus */}
              <p className="text-[11px] text-[#6B6B6B] mt-0.5 flex items-center justify-between gap-1">
                {experienceCountLabel(loc.experience_count)}
                <ChevronRight size={13} className="text-[#C9C5BD] group-hover:text-[#E8440A] transition-colors flex-shrink-0" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
