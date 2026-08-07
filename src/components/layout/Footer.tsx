'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// pe fluxurile de autentificare, wizard-uri și în admin, footerul doar încurcă
const HIDDEN_ON = ['/login', '/register', '/onboarding', '/add-experience', '/admin']

export default function Footer() {
  const pathname = usePathname()
  if (HIDDEN_ON.some(route => pathname.startsWith(route))) return null

  return (
    <footer className="border-t border-[rgba(0,0,0,0.08)] mt-8 pb-24 md:pb-6 pt-5 px-5">
      <div className="max-w-[780px] mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <Link href="/termeni" className="text-[12px] text-[#6B6B6B] hover:text-[#E8440A] transition-colors">
          Termeni și condiții
        </Link>
        <Link href="/confidentialitate" className="text-[12px] text-[#6B6B6B] hover:text-[#E8440A] transition-colors">
          Confidențialitate
        </Link>
        <a href="mailto:contact@pocoloco.travel" className="text-[12px] text-[#6B6B6B] hover:text-[#E8440A] transition-colors">
          Contact
        </a>
        <span className="text-[12px] text-[#9B9B9B] w-full md:w-auto">
          © {new Date().getFullYear()} Pocoloco
        </span>
      </div>
    </footer>
  )
}
