import BottomNav from '@/components/layout/BottomNav'
import NotificationBell from '@/components/layout/NotificationBell'
import FeaturedSection from '@/components/home/FeaturedSection'
import FollowingSection from '@/components/home/FollowingSection'
import PopularLocationsSection from '@/components/home/PopularLocationsSection'
import PopularTripsSection from '@/components/home/PopularTripsSection'
import GuidesSection from '@/components/home/GuidesSection'
import PopularSection from '@/components/home/PopularSection'
import SearchBar from '@/components/home/SearchBar'
import type { Metadata } from 'next'
import { FeedScopeProvider } from '@/components/feed/FeedScope'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="content-wrap">
        {/* pe mobil sidebar-ul e ascuns, deci marca și clopoțelul stau aici */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="font-outfit text-[20px] font-bold text-[#E8440A]">🧭 pocoloco</span>
          <NotificationBell />
        </div>

        <div className="mb-5">
          <SearchBar />
        </div>
        <FeaturedSection />
        <PopularLocationsSection />
        <PopularTripsSection />
        {/* „Urmăresc" publică ce a arătat, „Din comunitate" nu-l repetă */}
        <FeedScopeProvider>
          <FollowingSection />
          <GuidesSection />
          <PopularSection />
        </FeedScopeProvider>
      </div>
      <BottomNav />
    </main>
  )
}
