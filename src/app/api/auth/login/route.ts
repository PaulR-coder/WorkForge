import { prisma } from '@/lib/prisma'
import { verifyPassword, setSession } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: user.initials,
    company: user.company,
  })

  await prisma.auditLog.create({
    data: { icon: '🔐', action: 'Login', detail: `${user.name} (${user.role})`, severity: 'info', userId: user.id },
  })

  return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, company: user.company })
}
