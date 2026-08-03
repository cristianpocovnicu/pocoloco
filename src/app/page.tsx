import BottomNav from '@/components/layout/BottomNav'
import UserMenu from '@/components/layout/UserMenu'
import FeaturedSection from '@/components/home/FeaturedSection'
import FollowingSection from '@/components/home/FollowingSection'
import PopularSection from '@/components/home/PopularSection'
import SearchBar from '@/components/home/SearchBar'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="pb-nav">
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="font-outfit text-xl font-bold text-[#E8440A]">
          🧭 pocoloco
        </Link>
        <UserMenu />
      </header>
      <div className="px-5 py-4">
        <SearchBar />
      </div>
      <FeaturedSection />
      <FollowingSection />
      <PopularSection />
      <BottomNav />
    </main>
  )
}
