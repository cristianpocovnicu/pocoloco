import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termeni și condiții — Pocoloco',
  description: 'Regulile de folosire a platformei Pocoloco.',
}

const UPDATED = '6 august 2026'

export default function TermeniPage() {
  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={16} className="text-[#6B6B6B]" />
          </Link>
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Termeni și condiții</span>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 py-6">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 md:p-7">
          <p className="text-[12px] text-[#9B9B9B] mb-6">Ultima actualizare: {UPDATED}</p>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">1. Ce este Pocoloco</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Pocoloco (pocoloco.travel) este o platformă socială pe care călătorii publică
              experiențe reale despre locurile vizitate, construiesc itinerarii și urmăresc
              alți călători. Folosind platforma, ești de acord cu termenii de mai jos. Dacă
              nu ești de acord cu ei, te rugăm să nu folosești serviciul.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">2. Contul tău</h2>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li>Trebuie să ai cel puțin 16 ani ca să îți faci cont.</li>
              <li>Datele de înregistrare trebuie să fie reale; nu te da drept altcineva.</li>
              <li>Ești responsabil pentru activitatea din contul tău și pentru păstrarea parolei în siguranță.</li>
              <li>Îți poți șterge contul oricând, scriindu-ne la adresa de contact de mai jos.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">3. Conținutul pe care îl publici</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">
              Rămâi proprietarul textelor, fotografiilor și itinerariilor pe care le publici.
              Prin publicare ne acorzi o licență neexclusivă, gratuită și mondială de a le
              afișa, stoca și distribui în cadrul platformei și în promovarea ei.
            </p>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Publici doar conținut care îți aparține sau pentru care ai drepturile necesare.
              Ștergerea conținutului din platformă îi oprește afișarea publică.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">4. Reguli de conduită</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">Nu sunt permise:</p>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li>conținut ilegal, care instigă la ură, violent sau discriminatoriu;</li>
              <li>hărțuirea, amenințarea sau expunerea datelor personale ale altcuiva;</li>
              <li>spam, reclamă mascată, recenzii false sau conturi multiple folosite pentru a manipula voturile;</li>
              <li>locuri inventate, informații înșelătoare sau fotografii care nu îți aparțin;</li>
              <li>încercări de a accesa neautorizat platforma sau conturile altor utilizatori.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">5. Moderare</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Locațiile adăugate de utilizatori sunt verificate de un administrator înainte
              să devină publice. Putem ascunde sau șterge conținutul care încalcă acești
              termeni și putem suspenda conturile care o fac repetat. Orice utilizator poate
              raporta conținut nepotrivit din aplicație.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">6. Informațiile despre locuri</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Experiențele și itinerariile sunt opinii ale utilizatorilor, nu recomandări
              oficiale. Programul, prețurile și condițiile de acces se pot schimba. Verifică
              informațiile la sursă înainte de a pleca la drum; călătorești pe propria
              răspundere.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">7. Disponibilitatea serviciului</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Pocoloco este oferit „ca atare&rdquo;. Putem modifica, suspenda sau întrerupe
              funcționalități, cu anunț prealabil când e posibil. Nu răspundem pentru
              pierderi indirecte rezultate din folosirea platformei, în limitele permise de lege.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">8. Modificarea termenilor</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Putem actualiza acești termeni. Schimbările importante vor fi anunțate în
              aplicație. Folosirea platformei după actualizare înseamnă acceptarea noii versiuni.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">9. Legea aplicabilă</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Acestor termeni li se aplică legea română. Eventualele litigii se soluționează
              pe cale amiabilă sau, în lipsă, de instanțele competente din România.
            </p>
          </section>

          <section>
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">10. Contact</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Pentru orice întrebare legată de acești termeni:{' '}
              <a href="mailto:contact@pocoloco.travel" className="text-[#E8440A] font-medium">contact@pocoloco.travel</a>.
            </p>
          </section>
        </div>

        <p className="text-[12px] text-[#9B9B9B] text-center mt-4">
          Vezi și{' '}
          <Link href="/confidentialitate" className="text-[#E8440A] font-medium">Politica de confidențialitate</Link>.
        </p>
      </div>
    </main>
  )
}
