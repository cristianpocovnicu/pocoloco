import Link from 'next/link'

const FOLLOWING = [
  { id: '1', type: 'Experienta', emoji: '🏰', bg: 'bg-[#FFF0EB]', user: 'MP', userName: 'Maria Popescu', title: 'Castelul Bran — cel mai impresionant loc din România', location: 'Bran, Brașov' },
  { id: '2', type: 'Experienta', emoji: '⛵', bg: 'bg-[#EEEDFB]', user: 'MA', userName: 'Mihai Alexe', title: 'Navigat fără motor o săptămână întreagă', location: 'Grecia' },
  { id: '3', type: 'Calatorie', emoji: '🏔️', bg: 'bg-[#ECFDF5]', user: 'RD', userName: 'Radu Dumitrescu', title: 'Transfăgărășan — drumul de vis al României', location: 'Argeș' },
]

export default function FollowingSection() {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Urmaresc</h2>
        <Link href="/following" className="text-sm text-[#E8440A] font-medium">Vezi tot</Link>
      </div>

      {/* Mobile: scroll orizontal / Desktop: grid 3 coloane */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
        {FOLLOWING.map((item) => (
          <Link
            key={item.id}
            href={`/location/${item.id}`}
            className="min-w-[220px] md:min-w-0 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex-shrink-0 md:flex-shrink block"
          >
            <div className={`${item.bg} h-[110px] flex items-center justify-center text-4xl relative`}>
              <span>{item.emoji}</span>
              <span className="absolute top-2 left-2 bg-[#E8440A] text-white text-[10px] font-outfit font-bold uppercase px-2 py-0.5 rounded-full">
                {item.type}
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-[#FFF0EB] flex items-center justify-center text-[9px] font-bold text-[#E8440A]">{item.user}</div>
                <span className="text-[12px] text-[#6B6B6B] font-medium">{item.userName}</span>
              </div>
              <p className="text-[13px] font-outfit font-semibold text-[#0F0F0F] leading-tight mb-1">{item.title}</p>
              <p className="text-[11px] text-[#9B9B9B]">📍 {item.location}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
