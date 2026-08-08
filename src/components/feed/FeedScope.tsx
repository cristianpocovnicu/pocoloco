'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Scope = {
  /** id-urile deja arătate mai sus; null cât timp încă nu se știu */
  shown: Set<string> | null
  /** anunță ce a afișat secțiunea de sus — și o listă goală e un răspuns */
  publishShown: (ids: string[]) => void
}

const FeedScopeContext = createContext<Scope>({
  shown: new Set(),
  publishShown: () => {},
})

/**
 * Ce a apucat „Urmăresc" să afișeze nu se mai repetă în „Din comunitate".
 *
 * Secțiunile sunt fiecare cu cererea ei, deci nu se pot filtra din SQL:
 * una nu știe ce a găsit cealaltă. Aici își spun. Cât timp `shown` e null,
 * secțiunea de jos încă nu are voie să deseneze — altfel duplicatul ar
 * apărea o clipă și ar dispărea, ceea ce sare în ochi mai tare decât dacă
 * ar fi rămas.
 */
export function FeedScopeProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Set<string> | null>(null)

  const publishShown = useCallback((ids: string[]) => setShown(new Set(ids)), [])
  const value = useMemo(() => ({ shown, publishShown }), [shown, publishShown])

  return <FeedScopeContext.Provider value={value}>{children}</FeedScopeContext.Provider>
}

export function useFeedScope() {
  return useContext(FeedScopeContext)
}
