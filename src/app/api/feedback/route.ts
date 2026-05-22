import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const where = session.role === 'superadmin' ? {} : { tenantId: session.tenantId }

  const requests = await prisma.featureRequest.findMany({
    where,
    orderBy: { upvotes: 'desc' },
    include: {
      user: { select: { name: true, initials: true } },
      votes: { where: { userId: session.id } },
    },
  })

  return Response.json(requests)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description } = await req.json()
  if (!title?.trim() || !description?.trim()) {
    return Response.json({ error: 'Title and description are required' }, { status: 400 })
  }

  const request = await prisma.featureRequest.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      userId: session.id,
      tenantId: session.tenantId,
    },
    include: {
      user: { select: { name: true, initials: true } },
      votes: { where: { userId: session.id } },
    },
  })

  return Response.json(request, { status: 201 })
}
