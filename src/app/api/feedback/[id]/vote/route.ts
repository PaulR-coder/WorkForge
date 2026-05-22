import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.featureVote.findUnique({
    where: { featureRequestId_userId: { featureRequestId: id, userId: session.id } },
  })
  if (existing) return Response.json({ error: 'Already voted' }, { status: 409 })

  await prisma.$transaction([
    prisma.featureVote.create({
      data: { featureRequestId: id, userId: session.id },
    }),
    prisma.featureRequest.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    }),
  ])

  return Response.json({ success: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.featureVote.findUnique({
    where: { featureRequestId_userId: { featureRequestId: id, userId: session.id } },
  })
  if (!existing) return Response.json({ error: 'Vote not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.featureVote.delete({
      where: { featureRequestId_userId: { featureRequestId: id, userId: session.id } },
    }),
    prisma.featureRequest.update({
      where: { id },
      data: { upvotes: { decrement: 1 } },
    }),
  ])

  return Response.json({ success: true })
}
