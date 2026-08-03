'use client'
import { useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { Bell, Settings, Share2, Star, MapPin, ArrowUp, MessageCircle } from 'lucide-react'
import { formatCount } from '@/lib/utils'

const TABS = ['Călătorii', 'Experiențe', 'Insigne']

const TRIPS = [
  { title: 'Transilvania în 7 zile', emoji: '🏔️', gradient: 'from-blue-900 to-emerald-700', type: 'Calatorie' },
  { title: 'Grecia cu barca 12 zile', emoji: '⛵', gradient: 'from-sky-400 to-blue-700', type: 'Calatorie' },
  { title: 'New York iarna', emoji: '🗽', gradient: 'from-amber-500 to-orange-800', type: 'Calatorie' },
  { title: 'Scandinavia fără plan', emoji: '🌲', gradient: 'from-emerald-400 to-emerald-900', type: 'Calatorie' },
]

const BADGES_EARNED = [
  { emoji: '🏰', name: 'Explorator Castele', bg: '#FFF0EB' },
  { emoji: '⛵', name: 'Navigat 10+ zile', bg: '#ECFDF5' },
  { emoji: '✍️', name: '100 Experiențe', bg: '#EEEDFB' },
  { emoji: '⭐', name: 'Ghid Experimentat', bg: '#FFFBEB' },
]
const BADGES_LOCKED = [
  { emoji: '🌍', name: '5 Continente' },
  { emoji: '📸', name: '500 Fotografii' },
  { emoji: '🏆', name: 'Expert Local' },
  { emoji: '👥', name: '5k Urmăritori' },
]

export default function ProfilePage() {
  const [tab, setTab] = useState(0)

  return (
    <main className="pb-nav">
      <TopBar showLogo rightElement={
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer"><Bell size={16} className="text-[#6B6B6B]" /></div>
          <div className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer"><Settings size={16} className="text-[#6B6B6B]" /></div>
        </div>
      } />

      {/* Hero */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-[rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8440A] to-orange-400 flex items-center justify-center font-outfit text-3xl font-bold text-white" style={{ boxShadow: '0 0 0 3px white, 0 0 0 5px #E8440A' }}>MA</div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
              <Star size={11} className="text-white fill-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-white border border-[rgba(0,0,0,0.08)] font-outfit text-[12px] font-semibold px-4 py-2 rounded-full">Editează</button>
            <button className="bg-[#EEEDFB] text-[#5B4FCF] font-outfit text-[12px] font-semibold px-3 py-2 rounded-full flex items-center gap-1"><Share2 size={13} />Share</button>
          </div>
        </div>
        <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F]">Mihai Alexe</h1>
        <p className="text-[13px] text-[#9B9B9B] mb-2">@mihai.alexe · Ghid Experimentat</p>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-3">Călătoresc de 12 ani. Cred că locurile ascunse spun cele mai bune povești. Bazat în Cluj, activ în toată Europa.</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['🇷🇴 România', '⛵ Navigat', '🏔️ Munte', '🏰 Castele', '🚗 Road trip'].map(t => (
            <span key={t} className="text-[11px] bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] px-2.5 py-1 rounded-full">{t}</span>
          ))}
        </div>
        <div className="flex pt-4 border-t border-[rgba(0,0,0,0.08)]">
          {[['47', 'călătorii'], ['183', 'experiențe'], ['2.1k', 'urmăritori'], ['8.4k', 'aprecieri']].map(([num, lbl], i) => (
            <div key={lbl} className={`flex-1 text-center ${i < 3 ? 'border-r border-[rgba(0,0,0,0.08)]' : ''}`}>
              <div className="font-outfit text-[18px] font-bold text-[#0F0F0F]">{num}</div>
              <div className="text-[11px] text-[#9B9B9B]">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide level */}
      <div className="bg-gradient-to-r from-[#EEEDFB] to-[#F0EEFF] px-5 py-3.5 flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)]">
        <div className="w-11 h-11 bg-[#5B4FCF] rounded-xl flex items-center justify-center text-xl flex-shrink-0">🧭</div>
        <div className="flex-1">
          <div className="font-outfit text-[14px] font-semibold text-[#5B4FCF]">Ghid Experimentat · Nivel 4</div>
          <div className="text-[12px] text-[#6B6B6B] mb-1.5">680 XP până la Nivel 5 — Expert Local</div>
          <div className="h-1.5 bg-[rgba(91,79,207,0.15)] rounded-full overflow-hidden">
            <div className="h-full bg-[#5B4FCF] rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="text-[10px] text-[#5B4FCF] font-medium mt-0.5">4,320 / 5,000 XP</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[rgba(0,0,0,0.08)] sticky top-[57px] z-20">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`flex-1 py-3 text-[13px] font-outfit font-medium border-b-2 transition-colors ${tab === i ? 'text-[#E8440A] border-[#E8440A]' : 'text-[#9B9B9B] border-transparent'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-5 pt-4">
        {tab === 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {TRIPS.map(trip => (
              <div key={trip.title} className={`rounded-2xl overflow-hidden h-28 bg-gradient-to-br ${trip.gradient} relative cursor-pointer`}>
                <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">{trip.emoji}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <span className="block text-[9px] font-outfit font-bold uppercase text-white bg-[#E8440A] px-1.5 py-0.5 rounded-full w-fit mb-1">{trip.type}</span>
                  <span className="font-outfit text-[12px] font-semibold text-white leading-tight">{trip.title}</span>
                </div>
              </div>
            ))}
            <div className="col-span-2 text-center py-2"><button className="text-[13px] text-[#E8440A] font-medium">Vezi toate 47 de călătorii</button></div>
          </div>
        )}
        {tab === 1 && (
          <div className="flex flex-col gap-3">
            {[
              { loc: 'Castelul Bran', addr: 'Bran, Brașov', stars: 5, text: 'Mergeți dimineața devreme la 9:00 să evitați coada. Castelul în sine merită — atmosfera medievală e autentică.', date: '14 mai 2025', ups: 341, comments: 87 },
              { loc: 'Centrul Vechi Brașov', addr: 'Brașov', stars: 4, text: 'Piața Sfatului la apus e magică. Evitați restaurantele turistice din centru — mergeți în Șchei pentru mâncare bună.', date: '13 mai 2025', ups: 219, comments: 43 },
            ].map(exp => (
              <div key={exp.loc} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">{exp.loc}</h3>
                    <p className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MapPin size={10} />{exp.addr}</p>
                  </div>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= exp.stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}</div>
                </div>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2">{exp.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9B9B9B]">{exp.date}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><ArrowUp size={11} />{exp.ups}</span>
                    <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MessageCircle size={11} />{exp.comments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 2 && (
          <div>
            <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-3">Insigne câștigate</h3>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {BADGES_EARNED.map(b => (
                <div key={b.name} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: b.bg, boxShadow: '0 0 0 2px #E8440A' }}>{b.emoji}</div>
                  <span className="text-[10px] text-[#6B6B6B] text-center leading-tight font-medium">{b.name}</span>
                </div>
              ))}
            </div>
            <h3 className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-3">Insigne blocate</h3>
            <div className="grid grid-cols-4 gap-3">
              {BADGES_LOCKED.map(b => (
                <div key={b.name} className="flex flex-col items-center gap-1.5 opacity-35">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F7F5] flex items-center justify-center text-2xl grayscale">{b.emoji}</div>
                  <span className="text-[10px] text-[#6B6B6B] text-center leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
