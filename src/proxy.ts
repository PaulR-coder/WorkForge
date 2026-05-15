import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = [
  '/login', '/register', '/verify', '/forgot-password', '/reset-password', '/invite', '/terms', '/privacy',
  '/api/auth/login', '/api/auth/verify', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/resend-verify',
  '/api/invites/accept', '/api/invites/info',
  '/api/seed', '/api/health', '/api/agent', '/api/register',
]

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('wf_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = verifyToken(token)
  if (!user || (user.role !== 'superadmin' && !user.tenantId)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('wf_session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
