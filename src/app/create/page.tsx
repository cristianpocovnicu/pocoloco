import { redirect } from 'next/navigation'

/**
 * Nu mai există un ecran de alegere: creezi o singură dată, în wizardul
 * „Povestește", iar acolo se decide singur dacă e vorba de un loc sau de
 * o activitate.
 *
 * Ruta rămâne ca redirect, pentru linkurile vechi și pentru butoanele
 * care încă trimit aici. Călătoria nu se mai construiește de la zero din
 * flux: se naște din locurile povestite, iar detaliile ei se cer la
 * pasul 2 al aceluiași ecran.
 */
export default function CreatePage() {
  redirect('/add-experience')
}
