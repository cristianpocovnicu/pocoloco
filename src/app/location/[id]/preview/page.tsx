import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import LocationView from '@/components/location/LocationView'
import { createClient } from '@/lib/supabase-server'
import { noIndex, type LocationPage } from '@/lib/seo'

/**
 * Locul, așa cum îl vede autorul lui înainte de aprobare.
 *
 * Ruta e dinamică pentru că citește sesiunea din cookies — și de aceea e
 * separată de `/location/<id>`, care rămâne cache-uită pentru toată lumea.
 * Nu duplică nimic: randează același `LocationView`, doar cu un banner
 * deasupra.
 *
 * Cine are voie decide RLS, nu codul de aici: `locations_select_visible`
 * (migrarea 2) întoarce locațiile neaprobate doar autorului și adminilor.
 * Pentru oricine altcineva query-ul vine gol și pagina spune același lucru
 * ca ruta publică.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = noIndex

export default async function LocationPreviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('locations')
    .select('*, adder:profiles!added_by(full_name, is_guide)')
    .eq('id', params.id)
    .maybeSingle()

  const location = (data as unknown as LocationPage | null) || null

  if (!location) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">⏳</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Locația nu e (încă) publică</p>
      <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">
        Ori nu există, ori un administrator încă o verifică. Revino puțin mai târziu.
      </p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
    </div>
  )

  // aprobată între timp: n-are rost să rămână cineva pe varianta necache-uită
  if (location.status === 'approved') return <LocationView location={location} />

  const respinsa = location.status === 'rejected'

  return (
    <LocationView
      location={location}
      banner={
        <div className={`px-5 py-3.5 flex items-start gap-2.5 border-b ${
          respinsa
            ? 'bg-[#FEF2F2] border-[rgba(220,38,38,0.15)]'
            : 'bg-[#FFFBEB] border-[rgba(217,119,6,0.15)]'
        }`}>
          <Clock size={17} className={`flex-shrink-0 mt-0.5 ${respinsa ? 'text-[#DC2626]' : 'text-[#D97706]'}`} />
          <div>
            <p className={`font-outfit text-[13px] font-semibold ${respinsa ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
              {respinsa ? 'Locul a fost respins' : 'Locul așteaptă aprobarea unui administrator'}
            </p>
            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
              {respinsa
                ? 'Nu apare public. Povestea ta rămâne — o găsești în profil.'
                : 'Povestea ta e publicată și vizibilă; locul apare în căutare după aprobare.'}
            </p>
          </div>
        </div>
      }
    />
  )
}
