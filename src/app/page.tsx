import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import FeaturedSection from '@/components/home/FeaturedSection'
import FollowingSection from '@/components/home/FollowingSection'
import PopularSection from '@/components/home/PopularSection'
import SearchBar from '@/components/home/SearchBar'
import { Bell } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="pb-nav">
      <TopBar
        showLogo
        rightElement={
          <div className="w-8 h-8 rounded-full bg-[#EEEDFB] flex items-center justify-center cursor-pointer">
            <Bell size={16} className="text-[#5B4FCF]" />
          </div>
        }
      />
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
