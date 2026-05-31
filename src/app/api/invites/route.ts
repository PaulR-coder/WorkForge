import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { requireTenantId } from '@/lib/tenant'
import { emailInvite } from '@/lib/email'
import { z } from 'zod'
import { apiError } from '@/lib/apiError'

const InviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'dispatcher', 'tech']),
})

const DeleteSchema = z.object({
  id: z.string().min(1),
})

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'manageUsers')) return apiError('Forbidden', 403)
  if (!session.tenantId) return apiError('No tenant context', 400)
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
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'manageUsers')) return apiError('Forbidden', 403)
  if (!session.tenantId) return apiError('No tenant context', 400)
  const db = tenantPrisma(session)

  const raw = await req.json().catch(() => null)
  if (!raw) return apiError('Invalid JSON', 400)
  const dr = DeleteSchema.safeParse(raw)
  if (!dr.success) return apiError(dr.error.issues[0].message, 400)
  const { id } = dr.data

  const tenantId = requireTenantId(session)
  const invite = await db.invite.findFirst({ where: { id, tenantId, usedAt: null } })
  if (!invite) return apiError('Not found', 404)

  await db.invite.delete({ where: { id } })

  await db.auditLog.create({
    data: { icon: '✉️', action: 'Invite cancelled', detail: `${invite.email} — ${invite.role}`, severity: 'warn', userId: session.id, tenantId },
  })

  return Response.json({ ok: true })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'manageUsers')) return apiError('Forbidden', 403)
  if (!session.tenantId) return apiError('No tenant context', 400)
  const db = tenantPrisma(session)

  const raw = await req.json().catch(() => null)
  if (!raw) return apiError('Invalid JSON', 400)
  const ir = InviteSchema.safeParse(raw)
  if (!ir.success) return apiError(ir.error.issues[0].message, 400)
  const { email, role } = ir.data

  const tenantId = requireTenantId(session)

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return apiError('A user with this email already exists', 409)

  const pending = await db.invite.findFirst({
    where: { email, tenantId, usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (pending) return apiError('An active invite for this email already exists', 409)

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, subscriptionStatus: true } })

  // Enforce 5-user limit on trial accounts
  if (tenant?.subscriptionStatus === 'trialing') {
    const [userCount, pendingCount] = await Promise.all([
      db.user.count({ where: { tenantId } }),
      db.invite.count({ where: { tenantId, usedAt: null, expiresAt: { gt: new Date() } } }),
    ])
    if (userCount + pendingCount >= 5) {
      return apiError('Trial accounts are limited to 5 users. Upgrade to add more.', 403)
    }
  }

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

  void emailInvite(email, tenant?.name ?? 'WorkForge', role, `${APP_URL}/invite?token=${token}`)

  await db.auditLog.create({
    data: { icon: '✉️', action: 'Invite sent', detail: `${email} — ${role}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json({ ok: true, inviteId: invite.id }, { status: 201 })
}
