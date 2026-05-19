import { prisma } from '@/lib/prisma'
import { hashPassword, setSession } from '@/lib/auth'

export async function POST(req: Request) {
  const { token, name, password } = await req.json()
  if (!token || !name || !password) return Response.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  if (password.length > 128) return Response.json({ error: 'Password must be 128 characters or fewer' }, { status: 400 })

  const invite = await prisma.invite.findUnique({ where: { token } })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return Response.json({ error: 'This invitation has expired or already been used.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } })
  if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })

  const tenant = await prisma.tenant.findUnique({ where: { id: invite.tenantId } })
  if (!tenant) return Response.json({ error: 'Workspace not found.' }, { status: 404 })

  const initials = name.trim().split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const hashed = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: invite.email,
      password: hashed,
      role: invite.role,
      initials,
      company: tenant.name,
      emailVerified: true,
      tenantId: invite.tenantId,
    },
  })

  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })

  await prisma.auditLog.create({
    data: { icon: '👤', action: 'User joined via invite', detail: `${user.name} (${user.role})`, severity: 'info', userId: user.id, tenantId: invite.tenantId },
  })

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: user.initials,
    company: tenant.name,
    tenantId: tenant.id,
  })

  return Response.json({ ok: true, name: user.name, role: user.role })
}
