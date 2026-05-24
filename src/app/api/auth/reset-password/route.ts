import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { apiError } from '@/lib/apiError'

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token || !password) return apiError('Missing fields', 400)
  if (password.length < 8) return apiError('Password must be at least 8 characters', 400)
  if (password.length > 128) return apiError('Password must be 128 characters or fewer', 400)

  const user = await prisma.user.findUnique({ where: { resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return apiError('This reset link has expired. Please request a new one.', 400)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password), resetToken: null, resetTokenExpiry: null },
  })

  return Response.json({ ok: true })
}
