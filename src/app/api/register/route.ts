import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword, getSession } from '@/lib/auth'
import { emailVerification } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rateLimit'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

export async function POST(req: Request) {
  const body = await req.json()
  const { companyName, name, email, superadminCreate } = body

  // Superadmin fast-path: skip rate limit and email verification
  if (superadminCreate) {
    const session = await getSession()
    if (!session || session.role !== 'superadmin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 })

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
    const slugExists = await prisma.tenant.findUnique({ where: { slug } })
    if (slugExists) return Response.json({ error: 'Company name already taken' }, { status: 409 })

    const tempPassword = randomBytes(5).toString('hex') // 10-char hex
    const hashed = await hashPassword(tempPassword)
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    const result = await prisma.$transaction(async tx => {
      const tenant = await tx.tenant.create({ data: { name: companyName, slug } })
      const user = await tx.user.create({
        data: { name, email, password: hashed, role: 'admin', initials, company: companyName, tenantId: tenant.id, emailVerified: true },
      })
      return { tenantId: tenant.id, userId: user.id }
    })

    return Response.json({ ok: true, tenantId: result.tenantId, tempPassword }, { status: 201 })
  }

  const ip = getIp(req)
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000) // 5 registrations per hour per IP
  if (!rl.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { password } = body

  if (!companyName || !name || !email || !password) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 })

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) return Response.json({ error: 'Company name already taken' }, { status: 409 })

  const hashed = await hashPassword(password)
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const verifyToken = randomBytes(32).toString('hex')

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: companyName, slug } })
    const user = await tx.user.create({
      data: {
        name, email, password: hashed, role: 'admin', initials,
        company: companyName, tenantId: tenant.id,
        emailVerified: false, verifyToken,
      },
    })
    await tx.auditLog.create({
      data: { icon: '🏢', action: 'Tenant registered', detail: `${companyName} — ${email}`, severity: 'info', userId: user.id, tenantId: tenant.id },
    })
  })

  void emailVerification(email, name, `${APP_URL}/verify?token=${verifyToken}`)

  return Response.json({ ok: true, needsVerification: true, email }, { status: 201 })
}
