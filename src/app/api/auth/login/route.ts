import { prisma } from '@/lib/prisma'
import { verifyPassword, setSession } from '@/lib/auth'
import { rateLimit, getIp } from '@/lib/rateLimit'

export async function POST(req: Request) {
  const ip = getIp(req)
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000) // 10 attempts per 15 min per IP
  if (!rl.ok) {
    return Response.json(
      { error: `Too many login attempts. Try again in ${rl.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { email, password } = await req.json()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!user.emailVerified) {
    return Response.json({ error: 'Please verify your email before signing in.', needsVerification: true, email: user.email }, { status: 403 })
  }

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: user.initials,
    company: user.company,
    tenantId: user.tenantId,
  })

  await prisma.auditLog.create({
    data: { icon: '🔐', action: 'Login', detail: `${user.name} (${user.role})`, severity: 'info', userId: user.id, tenantId: user.tenantId },
  })

  return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, company: user.company, tenantId: user.tenantId })
}
