import type { SessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export function getTenantFilter(session: SessionUser): { tenantId: string } | undefined {
  if (session.role === 'superadmin') return undefined
  if (!session.tenantId) redirect('/login')
  return { tenantId: session.tenantId }
}

export function requireTenantId(session: SessionUser): string {
  if (!session.tenantId) throw new Error('Operation requires a tenant context.')
  return session.tenantId
}
