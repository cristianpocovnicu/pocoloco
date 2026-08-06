'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { fetchLevels, levelProgress } from '@/lib/points'

type Props = {
  points: number | null | undefined
  level?: number | null
}

/** Nivelul, așa cum îl vede lumea pe profilul public. */
export default function LevelBadge({ points, level }: Props) {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const levels = await fetchLevels(createClient())
      if (!active) return
      setName(levelProgress(levels, points || 0).name)
    }
    load()
    return () => { active = false }
  }, [points])

  // fără puncte (sau înainte de migrare) nu arătăm un nivel gol
  if (!points || points <= 0 || !name) return null

  return (
    <span className="text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8440A] whitespace-nowrap">
      Nivel {level || 1} · {name}
    </span>
  )
}
