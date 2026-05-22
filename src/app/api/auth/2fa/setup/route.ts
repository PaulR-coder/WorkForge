import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

function generateBackupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true },
  })
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a new TOTP secret (Base32, 20 bytes = 32 base32 chars)
  const secret = randomAlphanumeric(32)

  const totp = new OTPAuth.TOTP({
    issuer: 'WorkForge',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const otpUri = totp.toString()

  // Generate QR code as data URI
  const qrCodeUrl = await QRCode.toDataURL(otpUri, {
    width: 240,
    margin: 1,
    color: { dark: '#f59e0b', light: '#050810' },
  })

  // Generate 8 backup codes (plain text — hashing happens on verify)
  const backupCodes = Array.from({ length: 8 }, generateBackupCode)

  return Response.json({ secret, qrCodeUrl, backupCodes })
}
