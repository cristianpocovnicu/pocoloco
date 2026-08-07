import { redirect } from 'next/navigation'

/**
 * Wizardul de călătorie a dispărut. O călătorie nu se mai construiește de
 * la zero, dintr-o listă de pin-uri: se naște din locurile pe care le
 * povestești, în fluxul unic, iar detaliile ei se cer abia la pasul 2.
 *
 * Ruta rămâne ca redirect, pentru linkurile vechi.
 */
export default function NewTripPage() {
  redirect('/add-experience')
}
