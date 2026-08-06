'use client'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen bg-[#F0EDE8] flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="text-5xl">🧭</div>
      <h1 className="font-outfit text-[18px] font-bold text-[#0F0F0F]">Ceva n-a mers bine</h1>
      <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">
        Pagina asta n-a putut fi încărcată. Încearcă din nou — restul site-ului funcționează.
      </p>
      <div className="flex gap-2 mt-2">
        <button onClick={reset} className="bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
          Încearcă din nou
        </button>
        <Link href="/" className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-sm font-medium px-5 py-2.5 rounded-full">
          Acasă
        </Link>
      </div>
    </div>
  )
}
