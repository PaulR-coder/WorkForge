import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { SessionUser } from '@/lib/auth'

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> }

const base = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base

// Raw client — use only for pre-auth routes, superadmin, cron jobs, and agent digest.
// RLS allows pass-through when app.tenant_id is unset; application-level filtering still applies.
export { base as prisma }

// Tenant-scoped client — wraps every query in a mini-transaction that sets
// app.tenant_id (or app.is_superadmin) so PostgreSQL RLS policies enforce row isolation.
export function tenantPrisma(session: SessionUser) {
  const isSuperadmin = session.role === 'superadmin'
  const tenantId = session.tenantId ?? ''

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await base.$transaction([
            isSuperadmin
              ? base.$executeRaw`SELECT set_config('app.is_superadmin', 'true', TRUE)`
              : base.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ])
          return result
        },
      },
    },
  })
}
