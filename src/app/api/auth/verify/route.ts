import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { verifyToken: token } })
  if (!user) return Response.json({ error: 'Invalid or expired verification link' }, { status: 400 })

  if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
    return Response.json({ error: 'This verification link has expired. Please request a new one.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
  })

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: user.initials,
    company: user.company,
    tenantId: user.tenantId,
  })

  return Response.json({ ok: true })
}
