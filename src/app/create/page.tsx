import { redirect } from 'next/navigation'

/**
 * Nu mai există un ecran de alegere: creezi o singură dată, în wizardul
 * „Povestește", iar acolo se decide singur dacă e vorba de un loc sau de
 * o activitate.
 *
 * Ruta rămâne ca redirect, pentru linkurile vechi și pentru butoanele
 * care încă trimit aici. Călătoria nu se mai construiește de la zero din
 * flux: se naște din prima experiență adăugată în ea (sau din /trip/new,
 * încă funcțional, dar scos din drumul principal).
 */
export default function CreatePage() {
  redirect('/add-experience')
}
