import { cookies } from 'next/headers'

export async function POST() {
  const jar = await cookies()
  jar.delete('wf_session')
  jar.delete('wf_real_session')
  return Response.json({ ok: true })
}
