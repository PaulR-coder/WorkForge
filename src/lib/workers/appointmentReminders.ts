import { prisma } from '@/lib/prisma'
import { emailAppointmentReminder } from '@/lib/email'
import { smsAppointmentReminder } from '@/lib/sms'
import type { AuditSeverity } from '@/generated/prisma/client'
import type { WorkerResult } from './pmAlerts'

export async function runAppointmentReminders(): Promise<WorkerResult> {
  const errors: string[] = []
  let processed = 0

  const now = new Date()
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000)

  let jobs: {
    id: string
    client: string
    clientEmail: string | null
    clientPhone: string | null
    address: string
    type: string
    scheduledAt: Date | null
    tenantId: string | null
    tenant: { name: string } | null
    tech: { name: string; phone: string | null } | null
  }[] = []

  try {
    jobs = await prisma.job.findMany({
      where: {
        scheduledAt: { gte: windowStart, lte: windowEnd },
        status: { in: ['scheduled', 'open'] },
        deletedAt: null,
      },
      select: {
        id: true,
        client: true,
        clientEmail: true,
        clientPhone: true,
        address: true,
        type: true,
        scheduledAt: true,
        tenantId: true,
        tenant: { select: { name: true } },
        tech: { select: { name: true, phone: true } },
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`appointmentReminders: failed to query jobs — ${msg}`)
    return { processed, errors }
  }

  if (jobs.length === 0) return { processed, errors }

  const auditEntries: { icon: string; action: string; detail: string; severity: AuditSeverity; tenantId: string | null }[] = []

  for (const job of jobs) {
    const companyName = job.tenant?.name ?? 'WorkForge'

    if (job.clientEmail && job.scheduledAt) {
      try {
        await emailAppointmentReminder(job.clientEmail, companyName, { ...job, scheduledAt: job.scheduledAt })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`job ${job.id}: email reminder failed — ${msg}`)
      }
    }

    if (job.tech?.phone && job.scheduledAt) {
      try {
        await smsAppointmentReminder(job.tech.phone, { ...job, scheduledAt: job.scheduledAt })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`job ${job.id}: SMS reminder failed — ${msg}`)
      }
    }

    auditEntries.push({
      icon: '🔔',
      action: 'Appointment reminder sent',
      detail: `${job.type} for ${job.client} scheduled tomorrow`,
      severity: 'info',
      tenantId: job.tenantId,
    })

    processed++
  }

  if (auditEntries.length > 0) {
    await prisma.auditLog.createMany({ data: auditEntries }).catch(() => {})
  }

  return { processed, errors }
}
