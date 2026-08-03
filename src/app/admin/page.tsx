import { Users, Pencil, MapPin, AlertTriangle, Bell } from 'lucide-react'

const STATS = [
  { label: 'Useri totali', value: '1,284', trend: '+12%', up: true, Icon: Users, iconBg: '#FFF0EB' },
  { label: 'Experiențe', value: '4,731', trend: '+28%', up: true, Icon: Pencil, iconBg: '#ECFDF5' },
  { label: 'Locații', value: '892', trend: '+8%', up: true, Icon: MapPin, iconBg: '#EEEDFB' },
  { label: 'Raportări active', value: '7', trend: '7 noi', up: false, Icon: AlertTriangle, iconBg: '#FFFBEB' },
]

const RECENT_REPORTS = [
  { title: 'Experiență cu limbaj ofensator', sub: 'Raportat de 3 useri · Castelul Bran · Maria P.', time: 'Acum 2 ore' },
  { title: 'Locație duplicată adăugată', sub: 'Raportat de 1 user · Sinaia · Auto-detectat', time: 'Acum 5 ore' },
  { title: 'Comentariu spam', sub: 'Raportat de 2 useri · Brașov · trolluser88', time: 'Ieri, 22:00' },
]

const BAR_DATA = [40, 55, 48, 72, 60, 88, 65]
const BAR_DAYS = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']

export default function AdminOverviewPage() {
  return (
    <div>
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Overview</h1>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#9B9B9B]">Luni, 3 Aug 2026</span>
          <div className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center relative cursor-pointer">
            <Bell size={16} className="text-[#6B6B6B]" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8440A] rounded-full border-2 border-white" />
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.iconBg }}>
                  <s.Icon size={18} className="text-[#0F0F0F]" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.up ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>{s.trend}</span>
              </div>
              <div className="font-outfit text-[22px] font-bold text-[#0F0F0F]">{s.value}</div>
              <div className="text-[11px] text-[#9B9B9B]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Useri noi — ultimele 7 zile</h2>
            <button className="text-[12px] text-[#E8440A] font-medium">Export CSV</button>
          </div>
          <div className="flex items-end gap-2 h-24">
            {BAR_DATA.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm" style={{ height: `${h}%`, background: i === 5 ? '#E8440A' : 'rgba(232,68,10,0.35)' }} />
                <span className="text-[9px] text-[#9B9B9B]">{BAR_DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F]">Raportări recente</h2>
            <a href="/admin/reports" className="text-[12px] text-[#E8440A] font-medium">Vezi toate →</a>
          </div>
          <div className="flex flex-col gap-2.5">
            {RECENT_REPORTS.map(r => (
              <div key={r.title} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-lg flex-shrink-0">🚩</div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#0F0F0F]">{r.title}</p>
                  <p className="text-[12px] text-[#6B6B6B]">{r.sub}</p>
                  <p className="text-[11px] text-[#9B9B9B] mt-0.5">{r.time}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-3 py-1.5 rounded-lg font-medium">Vizualizează</button>
                  <button className="text-[11px] bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg font-medium">Șterge</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
