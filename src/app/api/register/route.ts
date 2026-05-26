import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword, getSession } from '@/lib/auth'
import { emailVerification } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rateLimit'
import { getJobTypesForServices } from '@/lib/serviceJobTypes'
import Anthropic from '@anthropic-ai/sdk'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

async function generateOtherJobTypes(description: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY || !description.trim()) return []
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `A field service business describes their work as: "${description.trim()}"

List 6 to 8 specific job types for this business. Output each on its own line. No bullets, no numbers, no explanations — just the job type name (2 to 5 words each). Good examples: "Pool Chemical Balance", "Pressure Washing", "Filter Replacement".`,
      }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && l.length < 60)
      .slice(0, 8)
  } catch {
    return []
  }
}

async function seedJobTypes(tenantId: string, serviceTypes: string[], customService: string) {
  const knownServices = serviceTypes.filter(s => s !== 'Other')
  const names = getJobTypesForServices(knownServices)

  if (serviceTypes.includes('Other')) {
    const aiTypes = await generateOtherJobTypes(customService)
    for (const t of aiTypes) {
      if (!names.includes(t)) names.push(t)
    }
  }

  if (names.length === 0) return

  await prisma.jobType.createMany({
    data: names.map(name => ({ name, tenantId })),
    skipDuplicates: true,
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { companyName, name, email, superadminCreate, serviceTypes = [], customService = '' } = body

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

    const tempPassword = randomBytes(5).toString('hex')
    const hashed = await hashPassword(tempPassword)
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const result = await prisma.$transaction(async tx => {
      const tenant = await tx.tenant.create({ data: { name: companyName, slug, trialEndsAt, serviceTypes } })
      const user = await tx.user.create({
        data: { name, email, password: hashed, role: 'admin', initials, company: companyName, tenantId: tenant.id, emailVerified: true },
      })
      return { tenantId: tenant.id, userId: user.id }
    })

    void seedJobTypes(result.tenantId, serviceTypes, customService)
    return Response.json({ ok: true, tenantId: result.tenantId, tempPassword }, { status: 201 })
  }

  const ip = getIp(req)
  const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
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
  if (password.length > 128) {
    return Response.json({ error: 'Password must be 128 characters or fewer' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 })

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) return Response.json({ error: 'Company name already taken' }, { status: 409 })

  const hashed = await hashPassword(password)
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const verifyToken = randomBytes(32).toString('hex')
  const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const tenantId = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: companyName, slug, trialEndsAt, serviceTypes } })
    const user = await tx.user.create({
      data: {
        name, email, password: hashed, role: 'admin', initials,
        company: companyName, tenantId: tenant.id,
        emailVerified: false, verifyToken, verifyTokenExpiry,
      },
    })
    await tx.auditLog.create({
      data: { icon: '🏢', action: 'Tenant registered', detail: `${companyName} — ${email}`, severity: 'info', userId: user.id, tenantId: tenant.id },
    })
    return tenant.id
  })

  void seedJobTypes(tenantId, serviceTypes, customService)
  void emailVerification(email, name, `${APP_URL}/verify?token=${verifyToken}`)

  return Response.json({ ok: true, needsVerification: true, email }, { status: 201 })
}
