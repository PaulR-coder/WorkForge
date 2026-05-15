import { prisma } from '@/lib/prisma'

export async function GET() {
  const result = await prisma.user.updateMany({
    where: { name: 'Carlos Reyes' },
    data: { email: 'prios0815@gmail.com' },
  })
  return Response.json({ updated: result.count })
}
