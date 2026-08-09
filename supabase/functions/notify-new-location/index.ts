/**
 * Pocoloco — anunț pe email când un user propune un loc nou.
 *
 * Se declanșează dintr-un Database Webhook pe `INSERT` în `public.locations`
 * (Supabase → Database → Webhooks). Un rând inserat = o chemare = un email;
 * nu există buclă și nu există al doilea email pentru același loc, oricâte
 * povești s-ar publica în aceeași secundă.
 *
 * Rulează pe Deno, în Supabase Edge Functions — nu e cod al aplicației Next
 * și nu intră în bundle-ul ei.
 *
 * Variabile de mediu (Supabase → Edge Functions → Secrets):
 *   RESEND_API_KEY   cheia din resend.com
 *   ADMIN_EMAIL      unde ajunge anunțul (una sau mai multe, separate prin virgulă)
 *   MAIL_FROM        expeditorul verificat în Resend, ex. "Pocoloco <alerte@pocoloco.travel>"
 *   WEBHOOK_SECRET   valoare inventată de tine, pusă și în antetul webhookului
 *   SITE_URL         opțional; implicit https://pocoloco.travel
 *
 * Pașii de configurare sunt în docs/configurare-manuala.md.
 */

type LocationRow = {
  id: string
  name: string | null
  city: string | null
  country: string | null
  status: string | null
}

type WebhookPayload = {
  type?: string
  table?: string
  record?: LocationRow
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // Webhookul e o adresă publică: fără secret, oricine poate cere emailuri.
  const expected = Deno.env.get('WEBHOOK_SECRET')
  if (!expected || req.headers.get('x-webhook-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const record = payload.record
  if (!record?.id) return json({ skipped: 'fără rând' })

  // Doar propunerile: un loc adăugat direct ca aprobat n-are ce fi moderat.
  if (record.status !== 'pending') return json({ skipped: 'nu e pending' })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const to = (Deno.env.get('ADMIN_EMAIL') || '').split(',').map(a => a.trim()).filter(Boolean)
  const from = Deno.env.get('MAIL_FROM')

  // Lipsa configurării nu e o eroare a webhookului: răspundem 200 ca
  // Supabase să nu reîncerce la nesfârșit, dar o spunem în log.
  if (!apiKey || to.length === 0 || !from) {
    console.error('notify-new-location: lipsesc RESEND_API_KEY, ADMIN_EMAIL sau MAIL_FROM')
    return json({ skipped: 'neconfigurat' })
  }

  const site = Deno.env.get('SITE_URL') || 'https://pocoloco.travel'
  const name = record.name?.trim() || 'Loc fără nume'
  const where = [record.city, record.country].filter(Boolean).join(', ')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Pocoloco: loc nou de aprobat — ${name}`,
      text: [
        `${name}${where ? ` (${where})` : ''} așteaptă aprobarea.`,
        '',
        `Moderare: ${site}/admin/locations`,
        `Pagina locului: ${site}/location/${record.id}/preview`,
      ].join('\n'),
    }),
  })

  if (!response.ok) {
    // 500 => Supabase reîncearcă. O eroare de la Resend e temporară de
    // obicei; dacă nu e, se vede în logurile funcției.
    const detail = await response.text()
    console.error('notify-new-location: Resend a răspuns', response.status, detail)
    return json({ error: 'resend', status: response.status }, 500)
  }

  return json({ sent: true, location: record.id })
})
