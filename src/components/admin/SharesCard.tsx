'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

type ShareRow = {
  content_type: 'experience' | 'trip' | 'location' | 'profile'
  content_id: string
  platform: string
}

type TopItem = {
  key: string
  contentType: ShareRow['content_type']
  contentId: string
  count: number
  title: string
  href: string | null
}

const TYPE_LABEL: Record<string, string> = {
  experience: 'Experiență',
  trip: 'Călătorie',
  location: 'Locație',
  profile: 'Profil',
}

/**
 * Cât se distribuie în afara aplicației — cel mai bun semnal că un
 * conținut chiar merită. Ultimele 30 de zile, cu primele 5 conținuturi.
 */
export default function SharesCard() {
  const [total, setTotal] = useState(0)
  const [top, setTop] = useState<TopItem[]>([])
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('shares')
        .select('content_type, content_id, platform')
        .gte('created_at', since)
        .limit(2000)

      // tabelul vine din migrarea 024_20260807_points_4_shares
      if (error) {
        setMissing(true)
        setLoading(false)
        return
      }

      const rows = (data || []) as ShareRow[]
      setTotal(rows.length)

      const platforms: Record<string, number> = {}
      const counts: Record<string, { row: ShareRow; count: number }> = {}
      for (const row of rows) {
        platforms[row.platform] = (platforms[row.platform] || 0) + 1
        const key = `${row.content_type}:${row.content_id}`
        counts[key] = { row, count: (counts[key]?.count || 0) + 1 }
      }
      setByPlatform(platforms)

      const ranked = Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)

      // titlurile, două cereri indiferent câte rânduri sunt
      const tripIds = ranked.filter(([, v]) => v.row.content_type === 'trip').map(([, v]) => v.row.content_id)
      const locationIds = ranked.filter(([, v]) => v.row.content_type === 'location').map(([, v]) => v.row.content_id)

      const [trips, locations] = await Promise.all([
        tripIds.length > 0
          ? supabase.from('trips').select('id, title').in('id', tripIds)
          : Promise.resolve({ data: [] }),
        locationIds.length > 0
          ? supabase.from('locations').select('id, name').in('id', locationIds)
          : Promise.resolve({ data: [] }),
      ])

      const titles: Record<string, string> = {}
      for (const t of ((trips.data || []) as { id: string; title: string }[])) titles[t.id] = t.title
      for (const l of ((locations.data || []) as { id: string; name: string }[])) titles[l.id] = l.name

      setTop(ranked.map(([key, v]) => ({
        key,
        contentType: v.row.content_type,
        contentId: v.row.content_id,
        count: v.count,
        title: titles[v.row.content_id] || 'fără titlu',
        href: v.row.content_type === 'trip'
          ? `/trip/${v.row.content_id}`
          : v.row.content_type === 'location'
            ? `/location/${v.row.content_id}`
            : null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  if (missing) return null

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 size={15} className="text-[#5B4FCF]" />
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Share-uri</h2>
        </div>
        <span className="text-[11px] text-[#9B9B9B]">ultimele 30 de zile</span>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Loader2 size={18} className="animate-spin text-[#9B9B9B]" />
        </div>
      ) : (
        <>
          <p className="font-outfit text-[26px] font-bold text-[#0F0F0F] leading-none mb-0.5">{total}</p>
          <p className="text-[12px] text-[#9B9B9B] mb-3">
            {Object.entries(byPlatform)
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => `${platform} ${count}`)
              .join(' · ') || 'nimic distribuit încă'}
          </p>

          {top.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-3 border-t border-[rgba(0,0,0,0.06)]">
              {top.map(item => (
                <div key={item.key} className="flex items-center gap-2 text-[12px]">
                  <span className="text-[10px] font-outfit font-bold px-1.5 py-0.5 rounded-full bg-[#F8F7F5] text-[#6B6B6B] flex-shrink-0">
                    {TYPE_LABEL[item.contentType]}
                  </span>
                  {item.href ? (
                    <Link href={item.href} className="flex-1 min-w-0 truncate text-[#0F0F0F] hover:text-[#E8440A]">
                      {item.title}
                    </Link>
                  ) : (
                    <span className="flex-1 min-w-0 truncate text-[#6B6B6B]">{item.title}</span>
                  )}
                  <span className="text-[#9B9B9B] flex-shrink-0">{item.count}×</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
