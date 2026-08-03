import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import { Bookmark, CheckCircle, Share2, Globe, MapPin, Route, Star, ArrowUp, ArrowDown, MessageCircle, Pencil } from 'lucide-react'
import Link from 'next/link'

export default function LocationPage({ params }: { params: { id: string } }) {
  return (
    <main className="pb-nav">
      <TopBar showLogo rightElement={
        <div className="w-8 h-8 rounded-full bg-[#EEEDFB] flex items-center justify-center cursor-pointer">
          <Globe size={17} className="text-[#5B4FCF]" />
        </div>
      } />

      {/* Gallery */}
      <div className="grid grid-cols-2 gap-0.5 h-52">
        <div className="bg-gradient-to-br from-amber-200 to-amber-600 flex items-center justify-center text-7xl relative">
          🏰
          <span className="absolute top-2.5 right-2.5 bg-[#E8440A] text-white font-outfit text-xs font-bold px-2 py-0.5 rounded-full">8.3 / 10</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex-1 bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-4xl">🗡️</div>
          <div className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center text-4xl">🌿</div>
        </div>
      </div>

      {/* Title & Actions */}
      <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-outfit text-2xl font-bold text-[#0F0F0F]">Castelul Bran</h1>
            <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1 mt-0.5"><MapPin size={12} /> Brașov, România</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-[#EEEDFB] flex items-center justify-center flex-shrink-0">
            <Globe size={17} className="text-[#5B4FCF]" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 bg-[#E8440A] text-white font-outfit text-sm font-semibold rounded-full py-2.5 flex items-center justify-center gap-2">
            <Bookmark size={15} /> Vreau să merg
          </button>
          <button className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-sm font-medium rounded-full px-4 py-2.5 flex items-center gap-2">
            <CheckCircle size={15} /> Am fost
          </button>
          <button className="w-10 h-10 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
            <Share2 size={16} className="text-[#6B6B6B]" />
          </button>
        </div>
      </div>

      {/* Added by */}
      <div className="bg-white px-5 py-3 flex items-center gap-2 border-b border-[rgba(0,0,0,0.08)]">
        <span className="text-[12px] text-[#9B9B9B]">Adăugat de</span>
        <div className="w-6 h-6 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[10px] font-bold text-white">MA</div>
        <span className="text-[13px] font-medium text-[#0F0F0F]">Mihai Alexe</span>
        <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-2 py-0.5 rounded-full font-medium">Ghid Experimentat</span>
      </div>

      {/* Description */}
      <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
          Castelul Bran este o fortăreață medievală istorică din Transilvania, România, faimoasă pentru locația sa dramatică pe deal și asocierea cu legenda Draculei. Construit în secolul XIV, a servit drept reședință regală și bastion defensiv.
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)]">
          <div className="text-[13px] text-[#6B6B6B] flex items-center gap-1.5">
            <Route size={15} /> Locație în <strong>372 de călătorii</strong>
          </div>
          <button className="text-[13px] text-[#E8440A] font-medium">Vezi călătoriile</button>
        </div>
      </div>

      {/* Ratings */}
      <div className="bg-white px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
        <h2 className="font-outfit text-base font-semibold text-[#0F0F0F] mb-3">Evaluare medie</h2>
        {[
          { label: 'Experiență generală', value: 4.2, pct: 83 },
          { label: 'Acces și organizare', value: 3.0, pct: 60 },
          { label: 'Aglomerație și așteptare', value: 2.4, pct: 48 },
        ].map(r => (
          <div key={r.label} className="flex items-center gap-3 mb-2.5">
            <span className="text-[13px] text-[#6B6B6B] w-40 flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden">
              <div className="h-full bg-[#E8440A] rounded-full" style={{ width: `${r.pct}%` }} />
            </div>
            <span className="text-[13px] font-semibold text-[#0F0F0F] w-7 text-right">{r.value}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link href="/add-experience" className="mx-5 my-3 bg-[#5B4FCF] rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer block">
        <Pencil size={20} className="text-white/80" />
        <span className="font-outfit text-sm font-semibold text-white flex-1">Povestește-ne experiența ta</span>
        <span className="text-white/60">→</span>
      </Link>

      {/* Experiences */}
      <div className="px-5">
        <h2 className="font-outfit text-base font-semibold text-[#0F0F0F] py-3">Experiențe (439)</h2>

        {/* Experience card */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden mb-3">
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center text-[12px] font-bold text-white">MP</div>
              <span className="text-[13px] font-semibold text-[#0F0F0F]">Maria Popescu</span>
            </div>
            {[['Experiență', 5], ['Aglomerație', 2], ['Acces', 3]].map(([label, stars]) => (
              <div key={String(label)} className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-[#6B6B6B]">{label}</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={11} className={i <= Number(stars) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="px-3.5 pb-3 text-[13px] text-[#6B6B6B] leading-relaxed">
            Vizita la Castelul Bran a fost una dintre cele mai memorabile experiențe din România. Perched pe un deal înconjurat de munți, castelul arată exact ca din povești — sau dintr-un film cu vampiri.
          </p>
          {/* Thread */}
          <div className="mx-3.5 mb-3 bg-[#F8F7F5] rounded-xl p-3">
            <div className="flex gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-[#5B4FCF] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">DG</div>
              <div>
                <p className="text-[12px] font-semibold text-[#0F0F0F] mb-0.5">Dumitru Gabriel</p>
                <p className="text-[12px] text-[#6B6B6B]">Știi dacă se poate evita coada? Vreau să merg câteva ore și mi-e teamă de așteptare.</p>
              </div>
            </div>
            <div className="ml-9 border-l-2 border-[rgba(0,0,0,0.08)] pl-2.5">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[#E8440A] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">MP</div>
                <div>
                  <p className="text-[12px] font-semibold text-[#0F0F0F] mb-0.5">Maria Popescu</p>
                  <p className="text-[12px] text-[#6B6B6B]">Poți cumpăra bilete online și evita coada, dar când am mers noi site-ul era picat.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#F8F7F5] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]"><MessageCircle size={12} /> 759</div>
              <div className="flex items-center gap-1 bg-[#EEEDFB] text-[#5B4FCF] rounded-full px-2.5 py-1 text-[12px]"><ArrowUp size={12} /> 759</div>
              <div className="flex items-center gap-1 bg-[#F8F7F5] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]"><ArrowDown size={12} /></div>
            </div>
            <button className="text-[12px] text-[#6B6B6B] flex items-center gap-1">Discuție (439)</button>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
