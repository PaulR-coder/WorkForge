import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await prisma.user.update({
    where: { name: 'Carlos Reyes' },
    data: { email: 'prios0815@gmail.com' },
  })
  return Response.json({ updated: user.name, email: user.email })
}
