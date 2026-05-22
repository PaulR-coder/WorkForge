import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as OTPAuth from 'otpauth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json() as { code: string }

  if (!code) {
    return Response.json({ error: 'Code is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
    },
  })

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return Response.json({ error: '2FA is not enabled' }, { status: 400 })
  }

  // Try TOTP code first
  const totp = new OTPAuth.TOTP({
    issuer: 'WorkForge',
    label: session.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
  })

  const delta = totp.validate({ token: code.replace(/\s/g, ''), window: 1 })

  // If TOTP fails, try backup codes
  let validBackup = false
  if (delta === null) {
    const normalised = code.replace(/\s/g, '').toUpperCase()
    for (const hashed of user.twoFactorBackupCodes) {
      const match = await bcrypt.compare(normalised, hashed)
      if (match) {
        validBackup = true
        break
      }
    }
  }

  if (delta === null && !validBackup) {
    return Response.json({ error: 'Invalid code' }, { status: 400 })
  }

  // Disable 2FA
  await prisma.user.update({
    where: { id: session.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  })

  try {
    await prisma.auditLog.create({
      data: {
        icon: '🔓',
        action: '2FA Disabled',
        detail: `${session.email} disabled two-factor authentication`,
        severity: 'warn',
        userId: session.id,
        tenantId: session.tenantId,
      },
    })
  } catch { /* non-fatal */ }

  return Response.json({ success: true })
}
