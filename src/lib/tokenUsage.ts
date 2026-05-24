import { prisma } from '@/lib/prisma'

export const TOKEN_LIMIT = 150_000

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function recordTokens(
  tenantId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const period = currentPeriod()
  const total = inputTokens + outputTokens
  await prisma.tenantTokenUsage.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: { tenantId, period, tokensUsed: total, inputTokens, outputTokens },
    update: {
      tokensUsed:   { increment: total },
      inputTokens:  { increment: inputTokens },
      outputTokens: { increment: outputTokens },
    },
  })
}

export async function checkLimit(
  tenantId: string,
): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const period = currentPeriod()
  const record = await prisma.tenantTokenUsage.findUnique({
    where: { tenantId_period: { tenantId, period } },
    select: { tokensUsed: true },
  })
  const used = record?.tokensUsed ?? 0
  return { allowed: used < TOKEN_LIMIT, used, remaining: Math.max(0, TOKEN_LIMIT - used) }
}
