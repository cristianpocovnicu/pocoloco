const USERS = [
  { initials: 'MA', bg: '#5B4FCF', name: 'Mihai Alexe', handle: '@mihai.alexe', exp: 183, followers: '2.1k', status: 'Activ', statusClass: 'bg-[#ECFDF5] text-[#059669]' },
  { initials: 'MP', bg: '#E8440A', name: 'Maria Popescu', handle: '@maria.p', exp: 47, followers: '430', status: 'Activ', statusClass: 'bg-[#ECFDF5] text-[#059669]' },
  { initials: 'RD', bg: '#10B981', name: 'Radu Dumitrescu', handle: '@radu.d', exp: 52, followers: '680', status: 'Activ', statusClass: 'bg-[#ECFDF5] text-[#059669]' },
  { initials: 'T8', bg: '#6B7280', name: 'trolluser88', handle: '@troll88', exp: 3, followers: '2', status: 'Raportat', statusClass: 'bg-[#FEF2F2] text-[#DC2626]' },
]

export default function AdminUsersPage() {
  return (
    <div>
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-6 py-4 sticky top-0 z-10">
        <h1 className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Useri</h1>
      </header>
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
          <div className="p-3 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-2">
            {['Toți (1284)', 'Activi', 'Suspendați'].map((c, i) => (
              <button key={c} className={`text-[11px] px-3 py-1.5 rounded-full font-outfit font-medium border ${i === 0 ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'bg-[#F8F7F5] text-[#6B6B6B] border-[rgba(0,0,0,0.08)]'}`}>{c}</button>
            ))}
            <input className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-1.5 text-[12px] outline-none" placeholder="Caută user..." />
          </div>
          <table className="w-full">
            <thead><tr className="bg-[#F8F7F5]">
              {['User', 'Experiențe', 'Urmăritori', 'Status', 'Acțiuni'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wide border-b border-[rgba(0,0,0,0.08)]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {USERS.map(u => (
                <tr key={u.handle} className="border-b border-[rgba(0,0,0,0.06)] last:border-0 hover:bg-[rgba(0,0,0,0.01)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: u.bg }}>{u.initials}</div>
                      <div>
                        <div className="text-[13px] font-medium text-[#0F0F0F]">{u.name}</div>
                        <div className="text-[11px] text-[#9B9B9B]">{u.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#0F0F0F]">{u.exp}</td>
                  <td className="px-4 py-3 text-[13px] text-[#0F0F0F]">{u.followers}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${u.statusClass}`}>{u.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button className="text-[11px] bg-[#EEEDFB] text-[#5B4FCF] px-2.5 py-1 rounded-lg font-medium">Profil</button>
                      <button className="text-[11px] bg-[#FFFBEB] text-[#D97706] px-2.5 py-1 rounded-lg font-medium">Suspendă</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
