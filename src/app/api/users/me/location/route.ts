import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Toggle off — clear location data
  if (body.sharing === false) {
    await prisma.user.update({
      where: { id: session.id },
      data: { sharingLocation: false, lat: null, lng: null, locatedAt: null },
    })
    return Response.json({ ok: true })
  }

  const { lat, lng } = body
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return Response.json({ error: 'lat and lng required' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { lat, lng, locatedAt: new Date(), sharingLocation: true },
  })

  return Response.json({ ok: true })
}
