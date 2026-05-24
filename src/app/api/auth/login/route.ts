import { prisma } from '@/lib/prisma'
import { verifyPassword, setSession } from '@/lib/auth'
import { rateLimit, getIp } from '@/lib/rateLimit'
import { apiError } from '@/lib/apiError'

export async function POST(req: Request) {
  const ip = getIp(req)
  const { email, password } = await req.json()
  const rl = await rateLimit(`login:${ip}:${email}`, 15, 15 * 60 * 1000) // 15 attempts per 15 min per IP+account
  if (!rl.ok) {
    const minutes = Math.ceil(rl.retryAfter / 60)
    return Response.json(
      { error: `Too many attempts for this account. Try again in ${minutes} minutes.`, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { active: true, subscriptionStatus: true } } },
    // Include 2FA fields so we can gate the session cookie
  })
  if (!user || !user.active) {
    return apiError('Invalid credentials', 401)
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return apiError(`Account locked. Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} or contact your administrator.`, 423)
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    const newFailCount = user.failedLoginAttempts + 1
    const shouldLock = newFailCount >= 10
    void prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
      },
    })
    void prisma.auditLog.create({
      data: { icon: '🔐', action: 'Login failed', detail: `${user.email} — wrong password`, severity: 'warn', userId: user.id, tenantId: user.tenantId },
    })
    return apiError('Invalid credentials', 401)
  }

  // Block login for suspended/disabled tenants (superadmin bypasses this check)
  if (user.role !== 'superadmin' && user.tenant) {
    if (!user.tenant.active || user.tenant.subscriptionStatus === 'suspended') {
      return apiError('Your workspace has been suspended. Contact support@getworkforge.com.', 403)
    }
  }

  if (!user.emailVerified) {
    return apiError('Please verify your email before signing in.', 403, undefined, { needsVerification: true, email: user.email })
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

  // If 2FA is enabled, return a challenge instead of setting the session cookie.
  // The client will complete auth via /api/auth/2fa/challenge.
  if (user.twoFactorEnabled) {
    return Response.json({ requires2FA: true, userId: user.id })
  }

  // Reset failed login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

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
