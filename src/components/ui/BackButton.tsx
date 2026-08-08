'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/**
 * „Înapoi" are nevoie de istoricul browserului, deci de client — dar e
 * singura bucată din antet care are. Restul antetului rămâne server.
 */
export default function BackButton({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Înapoi"
      className={className || 'w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0'}
    >
      <ArrowLeft size={16} className="text-[#6B6B6B]" />
    </button>
  )
}
