import BottomNav from '@/components/layout/BottomNav'
import FeaturedSection from '@/components/home/FeaturedSection'
import FollowingSection from '@/components/home/FollowingSection'
import PopularLocationsSection from '@/components/home/PopularLocationsSection'
import GuidesSection from '@/components/home/GuidesSection'
import PopularSection from '@/components/home/PopularSection'
import SearchBar from '@/components/home/SearchBar'

export default function HomePage() {
  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="content-wrap">
        <div className="mb-5">
          <SearchBar />
        </div>
        <FeaturedSection />
        <PopularLocationsSection />
        <FollowingSection />
        <GuidesSection />
        <PopularSection />
      </div>
      <BottomNav />
    </main>
  )
}
