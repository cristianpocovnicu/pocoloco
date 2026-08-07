'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

type Gate = (message?: string) => void

const AuthGateContext = createContext<Gate>(() => {})

/**
 * Vizitatorul vede tot conținutul; contul se cere exact în momentul unei
 * acțiuni care îl are nevoie — un vot, un comentariu, o salvare.
 *
 * Dialogul duce la login sau înregistrare cu `?next=` spre pagina de unde
 * a plecat, ca după autentificare să se întoarcă unde era, nu pe acasă.
 */
export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)

  const ask = useCallback((text?: string) => {
    setMessage(text || 'Ai nevoie de un cont pentru asta.')
  }, [])

  useEffect(() => {
    if (!message) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMessage(null) }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [message])

  // exact pagina și starea din URL, ca întoarcerea să fie fidelă
  const query = searchParams.toString()
  const next = encodeURIComponent(`${pathname}${query ? `?${query}` : ''}`)

  return (
    <AuthGateContext.Provider value={ask}>
      {children}

      {message && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 flex items-end md:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMessage(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[360px] p-5 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMessage(null)}
              aria-label="Închide"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F8F7F5] flex items-center justify-center"
            >
              <X size={15} className="text-[#6B6B6B]" />
            </button>

            <div className="text-3xl mb-2">👋</div>
            <h2 className="font-outfit text-[17px] font-semibold text-[#0F0F0F] mb-1">
              Ai nevoie de un cont pentru asta
            </h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-4">
              {message} Te aducem înapoi aici imediat după.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href={`/register?next=${next}`}
                className="bg-[#E8440A] text-white font-outfit text-[14px] font-semibold py-3 rounded-full text-center"
              >
                Îmi fac cont
              </Link>
              <Link
                href={`/login?next=${next}`}
                className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[14px] font-medium py-3 rounded-full text-center"
              >
                Am deja cont
              </Link>
            </div>
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  )
}

/**
 * Întoarce funcția care cere contul. Mesajul e opțional și spune ce
 * anume încerca omul să facă („Votează experiențele care ți-au fost
 * utile.").
 */
export function useAuthGate(): Gate {
  return useContext(AuthGateContext)
}
