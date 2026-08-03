import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => {
            request.cookies.set({ name, value })
          })
          response = NextResponse.next({ request: { headers: request.headers } })
          cookies.forEach(({ name, value }) => {
            response.cookies.set({ name, value })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rute protejate
  const protectedRoutes = ['/add-experience', '/profile', '/admin']
  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin doar pentru tine
  if (request.nextUrl.pathname.startsWith('/admin') && user?.email !== 'cristian@pocoloco.world') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
