import { Prisma } from '@/generated/prisma/client'
import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { mergeSidebarPrefs } from '@/lib/sidebarPrefs'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { sidebarPrefs: true },
  })

  return Response.json(mergeSidebarPrefs(user?.sidebarPrefs))
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const body = await req.json().catch(() => ({}))
  const prefs = mergeSidebarPrefs(body)

  await db.user.update({
    where: { id: session.id },
    data: { sidebarPrefs: prefs as unknown as Prisma.InputJsonValue },
  })

  return Response.json({ ok: true })
}
