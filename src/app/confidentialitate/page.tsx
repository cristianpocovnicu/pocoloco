import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politica de confidențialitate — Pocoloco',
  description: 'Ce date colectăm, de ce, cât le păstrăm și ce drepturi ai.',
}

const UPDATED = '6 august 2026'

export default function ConfidentialitatePage() {
  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={16} className="text-[#6B6B6B]" />
          </Link>
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Confidențialitate</span>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 py-6">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 md:p-7">
          <p className="text-[12px] text-[#9B9B9B] mb-6">Ultima actualizare: {UPDATED}</p>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">1. Cine prelucrează datele</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Operatorul platformei Pocoloco (pocoloco.travel) prelucrează datele tale
              personale conform Regulamentului (UE) 2016/679 (GDPR). Ne poți scrie oricând
              la <a href="mailto:contact@pocoloco.travel" className="text-[#E8440A] font-medium">contact@pocoloco.travel</a>.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">2. Ce date colectăm</h2>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="text-[#0F0F0F]">La crearea contului:</strong> adresa de email, numele afișat, username-ul. Dacă intri cu Google, primim de la Google numele, adresa de email și poza de profil.</li>
              <li><strong className="text-[#0F0F0F]">Ce publici:</strong> experiențe, fotografii, itinerarii, comentarii, voturi, salvări, cine urmărești.</li>
              <li><strong className="text-[#0F0F0F]">Profil:</strong> bio și fotografia de profil, dacă le completezi.</li>
              <li><strong className="text-[#0F0F0F]">Tehnice:</strong> date minime de sesiune și de funcționare a serviciului.</li>
            </ul>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-2">
              Nu colectăm date de localizare în fundal și nu cerem date de card.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">3. De ce le folosim</h2>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li>ca să îți putem oferi contul și funcțiile platformei — temei: executarea contractului;</li>
              <li>ca să afișăm public conținutul pe care alegi să-l publici — temei: executarea contractului;</li>
              <li>ca să moderăm conținutul și să prevenim abuzurile — temei: interesul legitim de a menține o comunitate sigură;</li>
              <li>ca să îți trimitem notificări în aplicație despre reacțiile la conținutul tău — temei: interesul legitim.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">4. Ce este public</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Profilul tău (username, nume, bio, fotografie), experiențele, itinerariile,
              comentariile și numărul de urmăritori sunt vizibile oricui vizitează
              platforma. Adresa ta de email nu este niciodată afișată public.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">5. Cui le transmitem</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">
              Nu vindem date personale. Folosim furnizori care le prelucrează strict pentru
              noi, ca împuterniciți:
            </p>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="text-[#0F0F0F]">Supabase</strong> — bază de date, autentificare, stocarea fotografiilor;</li>
              <li><strong className="text-[#0F0F0F]">Vercel</strong> — găzduirea aplicației;</li>
              <li><strong className="text-[#0F0F0F]">Google</strong> — doar dacă alegi autentificarea cu Google.</li>
            </ul>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-2">
              Unii furnizori pot stoca date în afara Spațiului Economic European, caz în care
              transferul se face pe baza clauzelor contractuale standard aprobate de Comisia Europeană.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">6. Cookie-uri</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Folosim doar cookie-uri strict necesare, pentru a menține sesiunea de
              autentificare. Nu folosim cookie-uri de publicitate și nu urmărim
              comportamentul tău pe alte site-uri.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">7. Cât păstrăm datele</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Cât timp ai cont activ. La ștergerea contului, datele de profil și conținutul
              publicat sunt șterse în cel mult 30 de zile, cu excepția cazurilor în care
              legea ne obligă să păstrăm anumite informații mai mult.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">8. Drepturile tale</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">Conform GDPR, ai dreptul:</p>
            <ul className="text-[14px] text-[#6B6B6B] leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
              <li>de acces la datele tale și de a primi o copie;</li>
              <li>de rectificare a datelor inexacte — o poți face singur din Setări;</li>
              <li>de ștergere („dreptul de a fi uitat&rdquo;);</li>
              <li>de restricționare a prelucrării și de opoziție;</li>
              <li>la portabilitatea datelor;</li>
              <li>de a-ți retrage consimțământul, acolo unde prelucrarea se bazează pe el.</li>
            </ul>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-2">
              Scrie-ne la <a href="mailto:contact@pocoloco.travel" className="text-[#E8440A] font-medium">contact@pocoloco.travel</a> și
              răspundem în cel mult 30 de zile. Dacă nu ești mulțumit, te poți adresa
              Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter
              Personal (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-[#E8440A] font-medium">dataprotection.ro</a>.
            </p>
          </section>

          <section>
            <h2 className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-2">9. Minori</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Platforma nu este destinată persoanelor sub 16 ani. Dacă aflăm că am colectat
              date de la un minor sub această vârstă, le ștergem.
            </p>
          </section>
        </div>

        <p className="text-[12px] text-[#9B9B9B] text-center mt-4">
          Vezi și <Link href="/termeni" className="text-[#E8440A] font-medium">Termenii și condițiile</Link>.
        </p>
      </div>
    </main>
  )
}
