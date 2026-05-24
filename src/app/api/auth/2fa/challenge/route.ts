import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/auth'
import * as OTPAuth from 'otpauth'
import bcrypt from 'bcryptjs'
import { apiError } from '@/lib/apiError'

export async function POST(req: Request) {
  const { userId, code } = await req.json() as { userId: string; code: string }

  if (!userId || !code) {
    return apiError('Missing required fields', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: { select: { active: true, subscriptionStatus: true } } },
  })

  if (!user || !user.active || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return apiError('Invalid request', 400)
  }

  const normalised = code.replace(/\s/g, '')

  // Try TOTP first
  const totp = new OTPAuth.TOTP({
    issuer: 'WorkForge',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
  })

  const delta = totp.validate({ token: normalised, window: 1 })

  // If TOTP fails, try backup codes
  let usedBackupIndex = -1
  if (delta === null) {
    const upper = normalised.toUpperCase()
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const match = await bcrypt.compare(upper, user.twoFactorBackupCodes[i])
      if (match) {
        usedBackupIndex = i
        break
      }
    }
  }

  if (delta === null && usedBackupIndex === -1) {
    return apiError('Invalid code', 401)
  }

  // Consume backup code if used
  if (usedBackupIndex !== -1) {
    const remaining = user.twoFactorBackupCodes.filter((_, i) => i !== usedBackupIndex)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: remaining },
    })
  }

  // Resolve tenantId (same logic as the main login route)
  let effectiveTenantId = user.tenantId
  if (!effectiveTenantId && user.role !== 'superadmin' && user.company) {
    try {
      const tenant = await prisma.tenant.findFirst({ where: { name: user.company } })
      if (tenant) {
        effectiveTenantId = tenant.id
        prisma.user.update({ where: { id: user.id }, data: { tenantId: tenant.id } }).catch(() => {})
      }
    } catch { /* non-fatal */ }
  }

  // Set the session cookie now that 2FA is verified
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
      data: {
        icon: '🔐',
        action: 'Login',
        detail: `${user.name} (${user.role}) — 2FA verified`,
        severity: 'info',
        userId: user.id,
        tenantId: user.tenantId,
      },
    })
  } catch { /* non-fatal */ }

  return Response.json({
    success: true,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials,
    company: user.company,
    tenantId: effectiveTenantId,
  })
}
