import { prisma } from './prisma'
import { hashPassword } from './auth'

export async function seedDatabase() {
  // Bypass RLS so seed queries work under FORCE ROW LEVEL SECURITY
  await prisma.$executeRawUnsafe(`SET app.tenant_id = ''`)

  // Ensure the superadmin account exists
  const existing = await prisma.user.findUnique({ where: { email: 'superadmin@workforge.io' } })
  if (!existing) {
    await prisma.user.create({
      data: {
        email: 'superadmin@workforge.io',
        name: 'Super Admin',
        password: await hashPassword('admin123'),
        role: 'superadmin',
        initials: 'SA',
        company: 'WorkForge',
        specialty: 'Platform Admin',
        tenantId: null,
        emailVerified: true,
      },
    })
  }
}
