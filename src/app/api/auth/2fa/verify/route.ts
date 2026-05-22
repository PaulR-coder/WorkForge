import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as OTPAuth from 'otpauth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { secret, code, backupCodes } = await req.json() as {
    secret: string
    code: string
    backupCodes: string[]
  }

  if (!secret || !code || !Array.isArray(backupCodes)) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate the TOTP code
  let otpSecret: OTPAuth.Secret
  try {
    otpSecret = OTPAuth.Secret.fromBase32(secret)
  } catch {
    return Response.json({ error: 'Invalid secret' }, { status: 400 })
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'WorkForge',
    label: session.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: otpSecret,
  })

  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) {
    return Response.json({ error: 'Invalid verification code' }, { status: 400 })
  }

  // Hash all backup codes before storing
  const hashedBackupCodes = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c.toUpperCase(), 10))
  )

  // Save to DB — enable 2FA
  await prisma.user.update({
    where: { id: session.id },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashedBackupCodes,
    },
  })

  try {
    await prisma.auditLog.create({
      data: {
        icon: '🔐',
        action: '2FA Enabled',
        detail: `${session.email} enabled two-factor authentication`,
        severity: 'info',
        userId: session.id,
        tenantId: session.tenantId,
      },
    })
  } catch { /* non-fatal */ }

  return Response.json({ success: true })
}
