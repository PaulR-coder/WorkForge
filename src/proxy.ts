import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Maintenance mode
// Set MAINTENANCE_MODE=true in your environment to enable.
// ---------------------------------------------------------------------------
const MAINTENANCE_EXEMPT = ['/maintenance', '/api/health', '/_next/', '/favicon']

function isMaintenanceExempt(pathname: string): boolean {
  return MAINTENANCE_EXEMPT.some(p => pathname.startsWith(p))
}

// Paths accessible without a session
const PUBLIC_PATHS = [
  '/login', '/register', '/verify', '/forgot-password', '/reset-password', '/invite', '/terms', '/privacy',
  '/api/auth/login', '/api/auth/verify', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/resend-verify',
  '/api/invites/accept', '/api/invites/info',
  '/api/seed', '/api/health', '/api/agent', '/api/register',
  // Stripe webhook authenticates via its own signature — no session required
  '/api/billing/webhook',
]

// Pages only the superadmin role may access
const SUPERADMIN_PATHS = ['/superadmin', '/api/superadmin']

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance mode: redirect all non-exempt traffic to /maintenance,
  // and redirect /maintenance back to / when maintenance is off.
  const maintenanceOn = process.env.MAINTENANCE_MODE === 'true'
  if (maintenanceOn && !isMaintenanceExempt(pathname)) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }
  if (!maintenanceOn && pathname === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // CSRF protection: for any state-changing API call originating from a browser,
  // verify the Origin header matches our own host so other sites cannot issue
  // cross-origin requests that carry the user's session cookie.
  if (
    pathname.startsWith('/api/') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    const origin = request.headers.get('origin')
    if (origin) {
      const host = request.headers.get('host') ?? ''
      let originHost: string
      try {
        originHost = new URL(origin).host
      } catch {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (originHost !== host) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const res = NextResponse.next()
    res.headers.set('x-pathname', pathname)
    return res
  }

  const token = request.cookies.get('wf_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = verifyToken(token)
  if (!user || (user.role !== 'superadmin' && !user.tenantId)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('wf_session')
    response.cookies.delete('wf_real_session')
    return response
  }

  // Restrict superadmin-only paths
  if (SUPERADMIN_PATHS.some(p => pathname.startsWith(p)) && user.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|sw.js|public).*)'],
}
