import Link from 'next/link'
import { ArrowLeft, Settings, Bell, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
  showBack?: boolean
  showLogo?: boolean
  rightElement?: React.ReactNode
  className?: string
}

export default function TopBar({ title, showBack, showLogo, rightElement, className }: TopBarProps) {
  return (
    <header className={cn(
      'bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 flex items-center justify-between sticky top-0 z-30',
      className
    )}>
      <div className="flex items-center gap-3">
        {showBack && (
          <Link href="javascript:history.back()" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
            <ArrowLeft size={16} className="text-[#6B6B6B]" />
          </Link>
        )}
        {showLogo && (
          <Link href="/" className="flex items-center gap-2">
            <span className="font-outfit text-xl font-bold text-[#E8440A]">🧭 pocoloco</span>
          </Link>
        )}
        {title && (
          <h1 className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {rightElement}
      </div>
    </header>
  )
}
