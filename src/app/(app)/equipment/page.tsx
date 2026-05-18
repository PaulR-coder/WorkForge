import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTenantFilter } from '@/lib/tenant'
import EquipmentClient from './EquipmentClient'

export default async function EquipmentPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const where = session.role === 'tech'
    ? { ...tenantFilter, jobs: { some: { techId: session.id } } }
    : tenantFilter
  const equipment = await prisma.equipment.findMany({ where, orderBy: { client: 'asc' } })

  return (
    <EquipmentClient
      initialEquipment={equipment.map(e => ({
        ...e,
        warrantyEnd: e.warrantyEnd ? e.warrantyEnd.toISOString() : null,
      }))}
      canEdit={can(session.role, 'editEquipment')}
    />
  )
}
