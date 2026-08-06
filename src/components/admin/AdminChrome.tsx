import AdminSidebar from './AdminSidebar'
import AdminMobileNav from './AdminMobileNav'
import type { AdminCounts } from './nav'

/** Rama dashboard-ului: sidebar pe desktop, nav pe mobil, conținutul în rest. */
export default function AdminChrome({
  counts,
  adminName,
  adminUsername,
  children,
}: {
  counts: AdminCounts
  adminName: string
  adminUsername: string | null
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F4F3F1] md:flex">
      <AdminSidebar counts={counts} adminName={adminName} adminUsername={adminUsername} />
      <div className="flex-1 min-w-0">
        <AdminMobileNav counts={counts} />
        <main>{children}</main>
      </div>
    </div>
  )
}
