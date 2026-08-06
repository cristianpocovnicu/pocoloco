import Link from 'next/link'

type Props = {
  illustration: 'compass' | 'people' | 'bell'
  title: string
  description: string
  action?: { href: string; label: string }
}

/** Ilustrații simple, desenate inline — fără fișiere de încărcat. */
function Illustration({ kind }: { kind: Props['illustration'] }) {
  const common = { width: 96, height: 96, viewBox: '0 0 96 96', fill: 'none', 'aria-hidden': true } as const

  if (kind === 'people') return (
    <svg {...common}>
      <circle cx="48" cy="48" r="46" fill="#FFF0EB" />
      <circle cx="37" cy="40" r="10" fill="#E8440A" />
      <path d="M21 68c0-9 7-16 16-16s16 7 16 16" stroke="#E8440A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="62" cy="44" r="8" fill="#5B4FCF" opacity="0.85" />
      <path d="M49 68c0-7 6-13 13-13s13 6 13 13" stroke="#5B4FCF" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
    </svg>
  )

  if (kind === 'bell') return (
    <svg {...common}>
      <circle cx="48" cy="48" r="46" fill="#EEEDFB" />
      <path d="M48 26c-9 0-16 7-16 16v10l-5 8h42l-5-8V42c0-9-7-16-16-16z" fill="#5B4FCF" />
      <path d="M42 66a6 6 0 0 0 12 0" stroke="#5B4FCF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="66" cy="30" r="7" fill="#E8440A" />
    </svg>
  )

  return (
    <svg {...common}>
      <circle cx="48" cy="48" r="46" fill="#FFF0EB" />
      <circle cx="48" cy="48" r="30" stroke="#E8440A" strokeWidth="4" />
      <path d="M60 36 42 42l-6 18 18-6 6-18z" fill="#E8440A" />
      <circle cx="48" cy="48" r="4" fill="white" />
    </svg>
  )
}

export default function EmptyState({ illustration, title, description, action }: Props) {
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl px-6 py-10 text-center">
      <div className="flex justify-center mb-4">
        <Illustration kind={illustration} />
      </div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1.5">{title}</p>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[340px] mx-auto">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex mt-5 bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
