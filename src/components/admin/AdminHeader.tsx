export default function AdminHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    // sticky doar pe desktop — pe mobil rămâne sticky nav-ul de admin
    <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 md:px-6 py-4 flex items-center justify-between gap-3 md:sticky md:top-0 z-20">
      <div className="min-w-0">
        <h1 className="font-outfit text-[17px] font-semibold text-[#0F0F0F] truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-[#9B9B9B] truncate">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-3 flex-shrink-0">{right}</div>}
    </header>
  )
}
