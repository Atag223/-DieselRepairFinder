import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, getSessionToken } from './lib/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page through without a session check
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Protect all /admin routes
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const expected = await getSessionToken()

    if (!session || session !== expected) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
