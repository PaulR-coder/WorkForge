import { prisma } from '@/lib/prisma'
import { hashPassword, setSession } from '@/lib/auth'

export async function POST(req: Request) {
  const body = await req.json()
  const { companyName, name, email, password } = body

  if (!companyName || !name || !email || !password) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'Email already registered' }, { status: 409 })
  }

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) {
    return Response.json({ error: 'Company name already taken' }, { status: 409 })
  }

  const hashed = await hashPassword(password)
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: companyName, slug },
    })
    const user = await tx.user.create({
      data: { name, email, password: hashed, role: 'admin', initials, company: companyName, tenantId: tenant.id },
    })
    await tx.auditLog.create({
      data: { icon: '🏢', action: 'Tenant registered', detail: `${companyName} — ${email}`, severity: 'info', userId: user.id, tenantId: tenant.id },
    })
    return { tenant, user }
  })

  await setSession({
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    initials: result.user.initials,
    company: result.tenant.name,
    tenantId: result.tenant.id,
  })

  return Response.json({
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    company: result.tenant.name,
    tenantId: result.tenant.id,
  }, { status: 201 })
}
