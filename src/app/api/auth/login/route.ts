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

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { active: true, subscriptionStatus: true } } },
  })
  if (!user || !user.active) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    void prisma.auditLog.create({
      data: { icon: '🔐', action: 'Login failed', detail: `${user.email} — wrong password`, severity: 'warn', userId: user.id, tenantId: user.tenantId },
    })
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Block login for suspended/disabled tenants (superadmin bypasses this check)
  if (user.role !== 'superadmin' && user.tenant) {
    if (!user.tenant.active || user.tenant.subscriptionStatus === 'suspended') {
      return Response.json({ error: 'Your workspace has been suspended. Contact support@getworkforge.com.' }, { status: 403 })
    }
  }

  if (!user.emailVerified) {
    return Response.json({ error: 'Please verify your email before signing in.', needsVerification: true, email: user.email }, { status: 403 })
  }

  // Recover tenantId at login time if DB record is missing it
  let effectiveTenantId = user.tenantId
  if (!effectiveTenantId && user.role !== 'superadmin' && user.company) {
    try {
      const tenant = await prisma.tenant.findFirst({ where: { name: user.company } })
      if (tenant) {
        effectiveTenantId = tenant.id
        prisma.user.update({ where: { id: user.id }, data: { tenantId: tenant.id } }).catch(() => {})
      }
    } catch {}
  }

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: user.initials,
    company: user.company,
    tenantId: effectiveTenantId,
  })

  try {
    await prisma.auditLog.create({
      data: { icon: '🔐', action: 'Login', detail: `${user.name} (${user.role})`, severity: 'info', userId: user.id, tenantId: user.tenantId },
    })
  } catch { /* non-fatal — RLS may block this on unpatched DB */ }

  return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, company: user.company, tenantId: effectiveTenantId })
}
