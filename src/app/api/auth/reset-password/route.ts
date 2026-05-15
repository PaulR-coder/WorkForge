import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token || !password) return Response.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return Response.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password), resetToken: null, resetTokenExpiry: null },
  })

  return Response.json({ ok: true })
}
