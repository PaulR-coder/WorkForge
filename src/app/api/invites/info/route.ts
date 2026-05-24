import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/apiError'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return apiError('Missing token', 400)

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  })

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return apiError('Invalid or expired invitation', 404)
  }

  return Response.json({ email: invite.email, role: invite.role, company: invite.tenant.name })
}
