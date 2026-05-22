import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Augment session with live DB fields (e.g. twoFactorEnabled)
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { twoFactorEnabled: true },
  })

  return Response.json({ ...session, twoFactorEnabled: user?.twoFactorEnabled ?? false })
}
