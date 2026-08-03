'use client'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/search')}
      className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[rgba(0,0,0,0.15)] transition-colors"
    >
      <Search size={16} className="text-[#9B9B9B]" />
      <span className="text-sm text-[#9B9B9B] font-sans">Unde vrei să mergi?</span>
    </button>
  )
}
