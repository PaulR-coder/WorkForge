import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'importData')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { type, data } = await req.json()
  if (!type || !data) return Response.json({ error: 'Missing type or data' }, { status: 400 })

  const db = tenantPrisma(session)

  if (type === 'job') {
    const priorityMap: Record<string, string> = { low: 'low', normal: 'normal', high: 'high', urgent: 'urgent' }
    const priority = priorityMap[data.priority] ?? 'normal'

    const job = await db.job.create({
      data: {
        client: data.client || 'Imported Client',
        address: data.address || '',
        description: data.description || '',
        type: data.jobType || 'General Service',
        priority: priority as 'low' | 'normal' | 'high' | 'urgent',
        status: 'open',
        tenantId: session.tenantId ?? undefined,
      },
    })
    return Response.json({ id: job.id, type: 'job', url: '/jobs', label: `Job for ${job.client}` })
  }

  if (type === 'estimate') {
    const count = await db.estimate.count()
    const number = `EST-${String(count + 1).padStart(3, '0')}`
    const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []
    const subtotal = data.subtotal ?? lineItems.reduce((s: number, i: { total?: number }) => s + (i.total || 0), 0)

    const estimate = await db.estimate.create({
      data: {
        number,
        client: data.client || 'Imported Client',
        clientEmail: data.clientEmail || '',
        jobType: data.jobType || 'General Service',
        description: data.description || '',
        lineItems,
        subtotal,
        notes: data.notes || '',
        status: 'draft',
        tenantId: session.tenantId ?? undefined,
        createdById: session.id,
      },
    })
    return Response.json({ id: estimate.id, type: 'estimate', url: '/estimates', label: `${number} for ${estimate.client}` })
  }

  if (type === 'invoice') {
    const count = await db.invoice.count()
    const number = `INV-${String(count + 1).padStart(4, '0')}`
    const labor = Number(data.labor) || 0
    const parts = Number(data.parts) || 0
    const surcharge = Number(data.surcharge) || 0
    const total = labor + parts + surcharge
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoice = await db.invoice.create({
      data: {
        number,
        client: data.client || 'Imported Client',
        clientEmail: data.clientEmail || '',
        labor,
        parts,
        surcharge,
        total,
        status: 'draft',
        dueDate,
        tenantId: session.tenantId ?? undefined,
      },
    })
    return Response.json({ id: invoice.id, type: 'invoice', url: '/invoices', label: `${number} for ${invoice.client}` })
  }

  return Response.json({ error: 'Unknown record type' }, { status: 400 })
}
