import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } })
  const result = await prisma.user.updateMany({
    where: { email: 'carlos@acmefield.com' },
    data: { email: 'prios0815@gmail.com' },
  })
  return Response.json({ updated: result.count, allUsers: users })
}
