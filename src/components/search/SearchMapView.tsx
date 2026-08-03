'use client'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

const PINS = [
  { id: 0, x: '38%', y: '58%', emoji: '🏰', name: 'Castelul Bran', address: 'Bran, Brașov', score: 8.3, exp: 439, gradient: 'from-amber-200 to-amber-500' },
  { id: 1, x: '52%', y: '50%', emoji: '👻', name: 'Castelul Groazei', address: 'Bran, Brașov', score: 7.1, exp: 87, gradient: 'from-violet-300 to-violet-600' },
  { id: 2, x: '62%', y: '38%', emoji: '🌲', name: 'Parcul Castelului', address: 'Bran, Brașov', score: 7.8, exp: 54, gradient: 'from-emerald-200 to-emerald-500' },
  { id: 3, x: '28%', y: '32%', emoji: '🏛️', name: 'Muzeul Brănean', address: 'Bran, Brașov', score: 7.4, exp: 31, gradient: 'from-amber-100 to-amber-400' },
  { id: 4, x: '74%', y: '28%', emoji: '🛖', name: 'Pensiunea Bran', address: 'Bran, Brașov', score: 6.9, exp: 18, gradient: 'from-red-100 to-red-400' },
]

export default function SearchMapView() {
  const [selected, setSelected] = useState(0)

  return (
    <div className="relative" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Map background */}
      <div className="absolute inset-0 bg-[#E8E4DC] overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#D4CEBC 1px, transparent 1px), linear-gradient(90deg, #D4CEBC 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute left-0 right-0 bg-[#C8BFA8] h-2.5" style={{ top: '38%' }} />
        <div className="absolute left-0 right-0 bg-[#D4CEBC] h-1.5" style={{ top: '22%' }} />
        <div className="absolute left-0 right-0 bg-[#D4CEBC] h-1.5" style={{ top: '55%' }} />
        <div className="absolute top-0 bottom-0 bg-[#D4CEBC] w-1.5" style={{ left: '30%' }} />
        <div className="absolute top-0 bottom-0 bg-[#C8BFA8] w-2" style={{ left: '55%' }} />
        <div className="absolute bg-[#B8D4A8] rounded-lg opacity-70" style={{ left: '22%', top: '42%', width: '28%', height: '18%' }} />
        <div className="absolute bg-[#D9D4C6] rounded" style={{ left: '8%', top: '15%', width: '18%', height: '12%' }} />
        <div className="absolute bg-[#D9D4C6] rounded" style={{ left: '60%', top: '20%', width: '16%', height: '14%' }} />
      </div>

      {/* Pins */}
      {PINS.map(pin => (
        <button
          key={pin.id}
          onClick={() => setSelected(pin.id)}
          className="absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg border-2 transition-all ${selected === pin.id ? 'bg-[#E8440A] border-white scale-125' : 'bg-[#5B4FCF] border-white'}`}>
              {pin.emoji}
            </div>
            <div className={`w-0.5 h-2.5 rounded-b ${selected === pin.id ? 'bg-[#E8440A]' : 'bg-[#5B4FCF]'}`} />
          </div>
        </button>
      ))}

      {/* Bottom cards */}
      <div className="absolute bottom-0 left-0 right-0 pb-2">
        <div className="flex gap-2.5 px-4 overflow-x-auto scrollbar-hide">
          {PINS.map(pin => (
            <button
              key={pin.id}
              onClick={() => setSelected(pin.id)}
              className={`min-w-[230px] bg-white rounded-2xl overflow-hidden flex-shrink-0 shadow-lg text-left transition-all ${selected === pin.id ? 'border-2 border-[#E8440A]' : 'border border-[rgba(0,0,0,0.08)]'}`}
            >
              <div className="flex">
                <div className={`w-20 h-20 bg-gradient-to-br ${pin.gradient} flex items-center justify-center text-3xl flex-shrink-0`}>{pin.emoji}</div>
                <div className="p-3 flex-1">
                  <p className="font-outfit text-[13px] font-semibold text-[#0F0F0F] mb-0.5">{pin.name}</p>
                  <p className="text-[11px] text-[#9B9B9B] mb-1.5">📍 {pin.address}</p>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#E8440A] text-white font-outfit text-[10px] font-bold px-1.5 py-0.5 rounded-lg">{pin.score}</span>
                    <span className="text-[11px] text-[#9B9B9B] flex items-center gap-0.5"><MessageCircle size={10} /> {pin.exp}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
