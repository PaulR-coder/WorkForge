import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/apiError'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)

  // Augment session with live DB fields (e.g. twoFactorEnabled)
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { twoFactorEnabled: true },
  })

  return Response.json({ ...session, twoFactorEnabled: user?.twoFactorEnabled ?? false })
}
