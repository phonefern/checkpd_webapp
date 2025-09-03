// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createMiddlewareClient({ req: request, res: response })

  const { data: { session }, error } = await supabase.auth.getSession()

  console.log('Middleware session:', {
    session: session ? 'Authenticated' : 'Not authenticated',
    error: error?.message
  })

  // Block unauthenticated access to /pages/users/*
  if (!session && request.nextUrl.pathname.startsWith('/pages/users')) {
    return NextResponse.redirect(new URL('/pages/login', request.url))
  }

  // Redirect logged-in users away from login page
  if (session && request.nextUrl.pathname === '/pages/login') {
    return NextResponse.redirect(new URL('/pages/users', request.url))
  }

  return response
}

// Apply to specific routes
export const config = {
  matcher: ['/users/:path*', '/login'],
}
