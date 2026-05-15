import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { emailPasswordReset } from '@/lib/email'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

export async function POST(req: Request) {
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
