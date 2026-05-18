import { getSession, signToken, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId } = await req.json()
  if (!tenantId) return Response.json({ error: 'Missing tenantId' }, { status: 400 })

  const adminUser = await prisma.user.findFirst({
    where: { tenantId, role: { in: ['admin', 'superadmin'] }, active: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!adminUser) return Response.json({ error: 'No admin user found for tenant' }, { status: 404 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

  // Store the real superadmin token so we can restore it
  const realToken = cookieStore.get('wf_session')?.value ?? ''

  // Issue impersonation token
  const impersonationToken = signToken({
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
    initials: adminUser.initials,
    company: tenant?.name ?? '',
    tenantId,
    impersonating: true,
  })

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }

  cookieStore.set('wf_session', impersonationToken, { ...opts, maxAge: 60 * 60 * 2 })
  cookieStore.set('wf_real_session', realToken, { ...opts, maxAge: 60 * 60 * 2 })

  return Response.json({ ok: true })
}
