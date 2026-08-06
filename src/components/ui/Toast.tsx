'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Check, X, Info } from 'lucide-react'

type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; tone: Tone }

type ShowToast = (message: string, tone?: Tone) => void

const ToastContext = createContext<ShowToast>(() => {})

/** Mesaj scurt de confirmare. Providerul stă în layout-ul rădăcină, deci
 *  toast-ul supraviețuiește navigării (util după „publică" + redirect). */
export function useToast(): ShowToast {
  return useContext(ToastContext)
}

const TONE_STYLES: Record<Tone, { icon: typeof Check; className: string }> = {
  success: { icon: Check, className: 'bg-[#0F0F0F] text-white' },
  error: { icon: X, className: 'bg-[#DC2626] text-white' },
  info: { icon: Info, className: 'bg-[#5B4FCF] text-white' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  // valoarea nu se schimbă niciodată, deci consumatorii nu re-randează degeaba
  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[80] flex flex-col items-center gap-2 px-4 w-full max-w-[420px] pointer-events-none">
        {toasts.map(toast => {
          const { icon: Icon, className } = TONE_STYLES[toast.tone]
          return (
            <div
              key={toast.id}
              role="status"
              className={`animate-toast-in flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg ${className}`}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="font-outfit text-[13px] font-medium">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
