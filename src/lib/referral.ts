import { prisma } from '@/lib/prisma'

/**
 * Generates a URL-safe referral code from a company name.
 * Example: "Acme Field Services" → "ACME-FIELD-X4K2"
 * Max 20 chars total. Uppercase, dashes for spaces, strips special chars.
 */
export function generateReferralCode(companyName: string): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')

  const slug = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')   // strip special chars
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('-')

  // Budget: 20 total chars − 1 dash − 4 suffix chars = 15 chars for the slug
  const truncated = slug.slice(0, 15)

  return `${truncated}-${suffix}`
}

/**
 * Returns the existing referral code for the tenant, or creates a new one.
 */
export async function getOrCreateReferralCode(
  tenantId: string,
  userId: string,
  company: string,
): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { tenantId } })
  if (existing) return existing.code

  const code = generateReferralCode(company || 'WORKFORGE')

  // Handle race conditions — if unique constraint fires, just fetch again
  try {
    const created = await prisma.referralCode.create({
      data: { tenantId, userId, code },
    })
    return created.code
  } catch {
    const found = await prisma.referralCode.findUnique({ where: { tenantId } })
    if (found) return found.code
    throw new Error('Failed to create referral code')
  }
}
