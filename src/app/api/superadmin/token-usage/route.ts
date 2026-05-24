import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TOKEN_LIMIT } from '@/lib/tokenUsage'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const rows = await prisma.tenantTokenUsage.findMany({
    where: { period },
    include: { tenant: { select: { name: true } } },
    orderBy: { tokensUsed: 'desc' },
  })

  const totalTokens = rows.reduce((sum, r) => sum + r.tokensUsed, 0)

  return Response.json({
    period,
    limit: TOKEN_LIMIT,
    totalTokens,
    tenants: rows.map(r => ({
      tenantId: r.tenantId,
      tenantName: r.tenant.name,
      tokensUsed: r.tokensUsed,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      pct: Math.min(100, Math.round((r.tokensUsed / TOKEN_LIMIT) * 100)),
    })),
  })
}
