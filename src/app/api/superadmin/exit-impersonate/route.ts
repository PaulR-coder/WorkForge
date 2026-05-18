import { getSession, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const session = await getSession()

  if (!session?.impersonating) {
    return Response.json({ error: 'Not impersonating' }, { status: 400 })
  }

  const realToken = cookieStore.get('wf_real_session')?.value
  if (!realToken || !verifyToken(realToken)) {
    return Response.json({ error: 'Real session lost' }, { status: 400 })
  }

  cookieStore.set('wf_session', realToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  cookieStore.delete('wf_real_session')

  return Response.json({ ok: true })
}
