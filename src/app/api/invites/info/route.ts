import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  })

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return Response.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  return Response.json({ email: invite.email, role: invite.role, company: invite.tenant.name })
}
