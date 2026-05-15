import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { emailVerification } from '@/lib/email'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) return Response.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  await prisma.user.update({ where: { id: user.id }, data: { verifyToken: token } })
  void emailVerification(user.email, user.name, `${APP_URL}/verify?token=${token}`)

  return Response.json({ ok: true })
}
