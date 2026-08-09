'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase-client'

export type CurrentProfile = {
  id: string
  fullName: string | null
  username: string | null
  avatarUrl: string | null
  /** rolul: de el atârnă intrarea spre admin, pe mobil și pe desktop */
  role: string | null
}

/**
 * Profilul minim al userului logat, pentru bara de jos și clopoțel.
 *
 * Cache pe modul: bara de jos e randată pe fiecare pagină, iar fără el am
 * întreba baza de date la fiecare navigare pentru aceleași două câmpuri.
 */
let cache: { id: string; profile: CurrentProfile | null } | null = null

async function load(userId: string): Promise<CurrentProfile | null> {
  if (cache?.id === userId) return cache.profile

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, role')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null
    const row = data as { id: string; full_name: string | null; username: string | null; avatar_url: string | null; role: string | null }
    const profile: CurrentProfile = {
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      role: row.role,
    }
    cache = { id: userId, profile }
    return profile
  } catch {
    return null
  }
}

export function useCurrentProfile(): { profile: CurrentProfile | null; loading: boolean } {
  const [profile, setProfile] = useState<CurrentProfile | null>(cache?.profile ?? null)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    const apply = async (userId: string | null) => {
      if (!userId) {
        cache = null
        if (active) { setProfile(null); setLoading(false) }
        return
      }
      const data = await load(userId)
      if (active) { setProfile(data); setLoading(false) }
    }

    supabase.auth.getUser()
      .then(({ data }) => apply(data.user?.id ?? null))
      .catch(() => { if (active) setLoading(false) })

    // logarea sau delogarea schimbă avatarul din bara de jos pe loc
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user?.id ?? null)
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [])

  return { profile, loading }
}

/** Golește cache-ul după ce userul își schimbă poza sau numele. */
export function clearProfileCache(): void {
  cache = null
}
