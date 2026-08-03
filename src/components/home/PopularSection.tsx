import Link from 'next/link'
import { MessageCircle, ArrowUp, Eye } from 'lucide-react'
import { formatCount } from '@/lib/utils'

const POPULAR = [
  { id: '1', type: 'Calatorie', author: 'Mihai Alexe', initials: 'MA', avatarBg: '#5B4FCF', isGuide: true, location: 'Grecia', title: 'Navigat în Grecia timp de 12 zile', emoji: '⛵', gradient: 'from-sky-200 to-sky-500', hasImage: true, comments: 302, upvotes: 759 },
  { id: '2', type: 'Experienta', author: 'Maria Popescu', initials: 'MP', avatarBg: '#E8440A', isGuide: false, location: 'Castelul Bran, Brașov', title: 'Vizita la Castelul Bran — o experiență de neuitat', text: 'Castelul Bran a fost una dintre cele mai memorabile experiențe din România. Atmosfera medievală creează o senzație misterioasă chiar înainte să intri.', images: ['🏰', '🗡️', '🌿'], comments: 302, upvotes: 759 },
]

export default function PopularSection() {
  return (
    <section className="px-5 mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Popular</h2>
        <button className="flex items-center gap-1.5 text-[12px] text-[#5B4FCF] font-medium bg-[#EEEDFB] px-3 py-1.5 rounded-full">
          Filtre
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {POPULAR.map((post) => (
          <Link key={post.id} href={post.type === 'Calatorie' ? `/trip/${post.id}` : `/location/${post.id}`} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden block">
            <div className="p-3.5 pb-2.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: post.avatarBg }}>
                  {post.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[#0F0F0F]">{post.author}</span>
                    {post.isGuide && <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-medium">Ghid</span>}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#9B9B9B]">
                    <span className="bg-[#FFF0EB] text-[#E8440A] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">{post.type}</span>
                    <span>📍 {post.location}</span>
                  </div>
                </div>
              </div>
              <h3 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] leading-tight">{post.title}</h3>
            </div>
            {post.hasImage && (
              <div className={`h-[190px] bg-gradient-to-b ${post.gradient} flex items-center justify-center text-6xl opacity-80`}>
                {post.emoji}
              </div>
            )}
            {post.text && (
              <p className="px-3.5 py-2 text-[13px] text-[#6B6B6B] leading-relaxed">{post.text}</p>
            )}
            {post.images && (
              <div className="flex gap-1.5 px-3.5 pb-2.5">
                {post.images.map((img, i) => (
                  <div key={i} className="w-16 h-16 rounded-xl bg-[#F8F7F5] flex items-center justify-center text-2xl">{img}</div>
                ))}
              </div>
            )}
            <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                  <MessageCircle size={13} /> {formatCount(post.comments)}
                </div>
                <div className="flex items-center gap-1 bg-[#EEEDFB] text-[#5B4FCF] rounded-full px-2.5 py-1 text-[12px]">
                  <ArrowUp size={13} /> {formatCount(post.upvotes)}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[#6B6B6B] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1">
                <Eye size={13} /> Deschide
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
