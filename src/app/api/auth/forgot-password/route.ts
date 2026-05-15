import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { emailPasswordReset } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rateLimit'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

export async function POST(req: Request) {
  const ip = getIp(req)
  const rl = rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000) // 5 attempts per hour per IP
  if (!rl.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { email } = await req.json()
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (user && user.active) {
    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })
    void emailPasswordReset(user.email, user.name, `${APP_URL}/reset-password?token=${token}`)
  }

  // Always return ok — don't reveal if email exists
  return Response.json({ ok: true })
}
