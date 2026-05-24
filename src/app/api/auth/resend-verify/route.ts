import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { emailVerification } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rateLimit'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(req: Request) {
  const ip = getIp(req)
  const rl = await rateLimit(`resend-verify:${ip}`, 3, 60 * 60 * 1000) // 3 resends per hour per IP
  if (!rl.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { email } = await req.json()
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  // Always return ok — don't reveal whether email exists or is already verified
  if (!user || user.emailVerified) return Response.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: token, verifyTokenExpiry: new Date(Date.now() + TOKEN_TTL_MS) },
  })
  void emailVerification(user.email, user.name, `${APP_URL}/verify?token=${token}`)

  return Response.json({ ok: true })
}
