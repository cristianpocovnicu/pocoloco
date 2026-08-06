import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Împrospătează sesiunea Supabase la fiecare navigare.
 *
 * Fără asta, tokenul din cookie expiră (~1h) și componentele server nu mai
 * văd niciun user: clientul din browser își reînnoiește singur sesiunea, dar
 * cookie-ul rămâne vechi. Așa ajungea /admin să te trimită la /login deși
 * erai logat și aveai role = 'admin'.
 *
 * Middleware-ul NU blochează nimic: autorizarea rămâne în layout-uri și în
 * politicile RLS din bază.
 *
 * Notă: fișierul trebuie să stea în src/, lângă app/ — la rădăcina
 * proiectului Next nu îl încarcă atunci când codul e în src/.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          )
        },
      },
    }
  )

  // apelul în sine face reîmprospătarea și rescrie cookie-urile prin setAll
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // tot, mai puțin fișierele statice și imaginile
    '/((?!_next/static|_next/image|favicon.ico|icon-|apple-touch-icon|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
