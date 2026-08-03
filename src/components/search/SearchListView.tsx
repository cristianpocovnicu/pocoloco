import Link from 'next/link'
import { MessageCircle, Bookmark, ArrowUpDown } from 'lucide-react'

const RESULTS = [
  { id: '1', name: 'Castelul Bran', address: 'Bran, Brașov', desc: 'Fortăreață medievală legendară, asociată cu Dracula.', score: 8.3, type: 'Locație', typeColor: 'orange', emoji: '🏰', gradient: 'from-amber-200 to-amber-500', experiences: 439 },
  { id: '2', name: 'Castelul Groazei', address: 'Bran, Brașov', desc: 'Casa bântuită lângă Castelul Bran, cu sperieturi și surprize.', score: 7.1, type: 'Locație', typeColor: 'orange', emoji: '👻', gradient: 'from-violet-400 to-violet-700', experiences: 87 },
  { id: '3', name: 'Transilvania în 7 zile', address: 'Mihai Alexe · Ghid Experimentat', desc: 'Castele, sate, mâncare bună și drumuri de munte fără plan fix.', type: 'Călătorie', typeColor: 'violet', emoji: '🗺️', gradient: 'from-violet-100 to-violet-300', saves: 439 },
  { id: '4', name: 'Parcul Castelului', address: 'Bran, Brașov', desc: 'Parc verde ideal pentru picnic, lângă castel.', score: 7.8, type: 'Locație', typeColor: 'orange', emoji: '🌲', gradient: 'from-emerald-200 to-emerald-500', experiences: 54 },
  { id: '5', name: 'Muzeul Satului Brănean', address: 'Bran, Brașov', desc: 'Muzeu etnografic în aer liber, case tradiționale transilvănene.', score: 7.4, type: 'Locație', typeColor: 'orange', emoji: '🏛️', gradient: 'from-amber-100 to-amber-400', experiences: 31 },
]

export default function SearchListView() {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-[#9B9B9B]">24 locuri găsite</span>
        <button className="flex items-center gap-1.5 text-[12px] text-[#5B4FCF] font-medium bg-[#EEEDFB] px-3 py-1.5 rounded-full">
          <ArrowUpDown size={13} /> Populare
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {RESULTS.map((r) => (
          <Link key={r.id} href={r.type === 'Călătorie' ? `/trip/${r.id}` : `/location/${r.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex">
            <div className={`w-24 flex-shrink-0 bg-gradient-to-br ${r.gradient} flex items-center justify-center text-4xl`}>{r.emoji}</div>
            <div className="flex-1 p-3.5">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight pr-2">{r.name}</h3>
                {r.score && <span className="bg-[#E8440A] text-white font-outfit text-[11px] font-bold px-2 py-0.5 rounded-xl flex-shrink-0">{r.score}</span>}
              </div>
              <p className="text-[12px] text-[#9B9B9B] flex items-center gap-1 mb-1.5">📍 {r.address}</p>
              <p className="text-[12px] text-[#6B6B6B] leading-tight mb-2">{r.desc}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-outfit font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.typeColor === 'orange' ? 'bg-[#FFF0EB] text-[#E8440A]' : 'bg-[#EEEDFB] text-[#5B4FCF]'}`}>{r.type}</span>
                <span className="text-[11px] text-[#9B9B9B] flex items-center gap-1">
                  {r.experiences ? <><MessageCircle size={11} /> {r.experiences} experiențe</> : <><Bookmark size={11} /> {r.saves} salvări</>}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
