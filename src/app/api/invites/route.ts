import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { requireTenantId } from '@/lib/tenant'
import { emailInvite } from '@/lib/email'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant context' }, { status: 400 })
  const db = tenantPrisma(session)

  const tenantId = requireTenantId(session)
  const invites = await db.invite.findMany({
    where: { tenantId, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(invites)
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant context' }, { status: 400 })
  const db = tenantPrisma(session)

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'Missing invite id' }, { status: 400 })

  const tenantId = requireTenantId(session)
  const invite = await db.invite.findFirst({ where: { id, tenantId, usedAt: null } })
  if (!invite) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.invite.delete({ where: { id } })

  await db.auditLog.create({
    data: { icon: '✉️', action: 'Invite cancelled', detail: `${invite.email} — ${invite.role}`, severity: 'warn', userId: session.id, tenantId },
  })

  return Response.json({ ok: true })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant context' }, { status: 400 })
  const db = tenantPrisma(session)

  const { email, role } = await req.json()
  if (!email || !role) return Response.json({ error: 'Email and role required' }, { status: 400 })

  const INVITABLE_ROLES = ['admin', 'dispatcher', 'tech']
  if (!INVITABLE_ROLES.includes(role)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 })
  }

  const tenantId = requireTenantId(session)

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return Response.json({ error: 'A user with this email already exists' }, { status: 409 })

  const pending = await db.invite.findFirst({
    where: { email, tenantId, usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (pending) return Response.json({ error: 'An active invite for this email already exists' }, { status: 409 })

  const token = randomBytes(32).toString('hex')
  const invite = await db.invite.create({
    data: {
      email,
      role,
      token,
      tenantId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  void emailInvite(email, tenant?.name ?? 'WorkForge', role, `${APP_URL}/invite?token=${token}`)

  await db.auditLog.create({
    data: { icon: '✉️', action: 'Invite sent', detail: `${email} — ${role}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json({ ok: true, inviteId: invite.id }, { status: 201 })
}
