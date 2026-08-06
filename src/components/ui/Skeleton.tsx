/** Bloc gri care pulsează, cât se încarcă datele reale. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[rgba(0,0,0,0.06)] rounded animate-pulse ${className}`} />
}

/** Aceeași siluetă ca un card de experiență din feed. */
export function ExperienceCardSkeleton() {
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
      <div className="p-3.5 pb-2.5">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 w-28 mb-1.5" />
            <Skeleton className="h-2.5 w-40" />
          </div>
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3 w-full mb-1.5" />
        <Skeleton className="h-3 w-[85%] mb-1.5" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
      <div className="flex gap-1.5 px-3.5 pb-3">
        <Skeleton className="w-20 h-20 rounded-xl" />
        <Skeleton className="w-20 h-20 rounded-xl" />
      </div>
      <div className="px-3.5 py-2.5 border-t border-[rgba(0,0,0,0.06)] flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

/** Aceeași siluetă ca un rezultat de căutare. */
export function LocationRowSkeleton() {
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex">
      <Skeleton className="w-24 h-[92px] rounded-none flex-shrink-0" />
      <div className="flex-1 p-3.5">
        <Skeleton className="h-3.5 w-2/3 mb-2" />
        <Skeleton className="h-2.5 w-1/2 mb-3" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
    </div>
  )
}
