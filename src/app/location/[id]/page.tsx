import Link from 'next/link'
import LocationView from '@/components/location/LocationView'
import PendingRedirect from '@/components/location/PendingRedirect'
import { getLocationPage } from '@/lib/seo'

/**
 * Pagina publică a unui loc — randată pe server și cache-uită.
 *
 * Citește cu clientul anon, fără cookies: dacă ar citi sesiunea, ruta ar
 * deveni dinamică și s-ar pierde tot ce am câștigat în tranșa B. De aceea
 * aici există doar locațiile aprobate.
 *
 * Un loc încă neaprobat n-are pagină publică — dar autorul lui trebuie
 * să-l poată vedea. Pentru el, insula de mai jos verifică sesiunea în
 * browser și îl duce pe `/location/<id>/preview`, ruta dinamică ce citește
 * cookie-urile. Crawlerul și vizitatorul străin rămân cu textul de mai jos.
 */
export const revalidate = 300

export default async function LocationPage({ params }: { params: { id: string } }) {
  const location = await getLocationPage(params.id)

  if (!location) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <div className="text-4xl">⏳</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Locația nu e (încă) publică</p>
      <p className="text-[13px] text-[#6B6B6B] max-w-[320px]">
        Ori nu există, ori un administrator încă o verifică. Revino puțin mai târziu.
      </p>
      <Link href="/" className="text-[#E8440A] font-medium">← Înapoi acasă</Link>
      <PendingRedirect locationId={params.id} />
    </div>
  )

  return <LocationView location={location} />
}
