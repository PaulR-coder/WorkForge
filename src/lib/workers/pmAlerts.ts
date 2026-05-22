/**
 * PM Alerts worker
 *
 * Equipment in this schema doesn't have a `nextServiceDate` column.
 * Instead it tracks `lastPMDaysAgo` (days since last service) and
 * `intervalDays` (service interval).  We derive "due date" as:
 *
 *   nextServiceDaysFromNow = intervalDays - lastPMDaysAgo
 *
 * Alert conditions:
 *   • overdue:          nextServiceDaysFromNow <  0
 *   • due within 7 days: nextServiceDaysFromNow >= 0 && <= 7
 */

import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export interface WorkerResult {
  processed: number
  errors: string[]
}

export async function runPmAlerts(): Promise<WorkerResult> {
  const errors: string[] = []
  let processed = 0

  // ── 1. Fetch all equipment that is due or overdue ────────────────────────
  let equipment: {
    id: string
    name: string
    client: string
    intervalDays: number
    lastPMDaysAgo: number
    tenantId: string | null
  }[] = []

  try {
    // We load all active equipment and filter in JS to avoid complex raw SQL.
    // The table is expected to be reasonably sized for a tenant.
    equipment = await prisma.equipment.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        intervalDays: true,
        lastPMDaysAgo: true,
        tenantId: true,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`pmAlerts: failed to query equipment — ${msg}`)
    return { processed, errors }
  }

  // Filter to items due within 7 days or already overdue
  const dueItems = equipment.filter((eq) => {
    const daysUntilDue = eq.intervalDays - eq.lastPMDaysAgo
    return daysUntilDue <= 7
  })

  if (dueItems.length === 0) return { processed, errors }

  // ── 2. Group by tenant ──────────────────────────────────────────────────
  const byTenant = new Map<string, typeof dueItems>()
  for (const eq of dueItems) {
    const key = eq.tenantId ?? '__null__'
    if (!byTenant.has(key)) byTenant.set(key, [])
    byTenant.get(key)!.push(eq)
  }

  // Resend client (only instantiated if key present)
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null
  const FROM = 'alerts@getworkforge.com'

  // ── 3. Process each tenant group ────────────────────────────────────────
  for (const [tenantKey, items] of byTenant) {
    const tenantId = tenantKey === '__null__' ? null : tenantKey

    // Fetch admin/dispatcher users for email notifications
    let adminUsers: { email: string; name: string }[] = []
    if (resend && tenantId) {
      try {
        adminUsers = await prisma.user.findMany({
          where: { tenantId, role: { in: ['admin', 'dispatcher'] }, active: true },
          select: { email: true, name: true },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`pmAlerts: failed to query admin users for tenant ${tenantId} — ${msg}`)
      }
    }

    for (const eq of items) {
      const daysUntilDue = eq.intervalDays - eq.lastPMDaysAgo
      const isOverdue = daysUntilDue < 0
      const overdueBy = Math.abs(daysUntilDue)

      // Compute a human-readable due-date string
      const dueDateObj = new Date()
      dueDateObj.setDate(dueDateObj.getDate() + daysUntilDue)
      const dueDateStr = dueDateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      const detail = isOverdue
        ? `${eq.name} (${eq.client}) is overdue for service by ${overdueBy} day${overdueBy !== 1 ? 's' : ''}`
        : `${eq.name} (${eq.client}) is due for service on ${dueDateStr}`

      // ── Audit log entry ────────────────────────────────────────────────
      try {
        await prisma.auditLog.create({
          data: {
            icon: '🔧',
            action: 'PM Alert',
            detail,
            severity: 'warn',
            tenantId,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`pmAlerts: failed to write audit log for equipment ${eq.id} — ${msg}`)
        continue
      }

      processed++

      // ── Email notification ────────────────────────────────────────────
      if (resend && adminUsers.length > 0) {
        const subject = isOverdue
          ? `PM Overdue: ${eq.name}`
          : `PM Due: ${eq.name}`

        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
            <h2 style="margin-bottom:4px">${subject}</h2>
            <p style="color:#475569;font-size:14px;margin-bottom:20px">${detail}</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:140px">Equipment</td>
                <td style="padding:8px 12px">${eq.name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Client</td>
                <td style="padding:8px 12px">${eq.client}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Service Interval</td>
                <td style="padding:8px 12px">Every ${eq.intervalDays} days</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Status</td>
                <td style="padding:8px 12px;color:${isOverdue ? '#dc2626' : '#d97706'};font-weight:700">
                  ${isOverdue ? `Overdue by ${overdueBy} day${overdueBy !== 1 ? 's' : ''}` : `Due ${dueDateStr}`}
                </td>
              </tr>
            </table>
            <p style="margin-top:28px;font-size:12px;color:#94a3b8">
              Log in to WorkForge to schedule a service visit.
            </p>
          </div>
        `

        for (const user of adminUsers) {
          try {
            await resend.emails.send({
              from: FROM,
              to: user.email,
              subject,
              html,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`pmAlerts: email failed for ${user.email} (equipment ${eq.id}) — ${msg}`)
          }
        }
      }
    }
  }

  return { processed, errors }
}
