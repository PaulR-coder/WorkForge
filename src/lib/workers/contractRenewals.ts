/**
 * Contract Renewals worker
 *
 * The Contract model does not have an `endDate` column.
 * It has `nextDueDate` which represents the next scheduled service date.
 * We treat contracts whose `nextDueDate` is within the next 30 days as
 * "coming due" and notify admin users so they can reach out to clients.
 *
 * Only active contracts (active === true) are considered.
 */

import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export interface WorkerResult {
  processed: number
  errors: string[]
}

export async function runContractRenewals(): Promise<WorkerResult> {
  const errors: string[] = []
  let processed = 0

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // ── 1. Fetch contracts due within 30 days ──────────────────────────────
  let contracts: {
    id: string
    name: string
    client: string
    nextDueDate: Date
    tenantId: string | null
  }[] = []

  try {
    contracts = await prisma.contract.findMany({
      where: {
        active: true,
        nextDueDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        client: true,
        nextDueDate: true,
        tenantId: true,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`contractRenewals: failed to query contracts — ${msg}`)
    return { processed, errors }
  }

  if (contracts.length === 0) return { processed, errors }

  // ── 2. Group by tenant for email batching ──────────────────────────────
  const byTenant = new Map<string, typeof contracts>()
  for (const c of contracts) {
    const key = c.tenantId ?? '__null__'
    if (!byTenant.has(key)) byTenant.set(key, [])
    byTenant.get(key)!.push(c)
  }

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
        errors.push(`contractRenewals: failed to query admin users for tenant ${tenantId} — ${msg}`)
      }
    }

    for (const contract of items) {
      const dueDateStr = contract.nextDueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      const msUntilDue = contract.nextDueDate.getTime() - now.getTime()
      const daysUntilDue = Math.ceil(msUntilDue / (1000 * 60 * 60 * 24))

      const detail = `Contract "${contract.name}" for ${contract.client} is due for renewal on ${dueDateStr} (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''})`

      // ── Audit log entry ────────────────────────────────────────────────
      try {
        await prisma.auditLog.create({
          data: {
            icon: '📑',
            action: 'Contract Renewal Due',
            detail,
            severity: 'info',
            tenantId,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`contractRenewals: failed to write audit log for contract ${contract.id} — ${msg}`)
        continue
      }

      processed++

      // ── Email notification to admins ─────────────────────────────────
      if (resend && adminUsers.length > 0) {
        const subject = `Contract Due: ${contract.name} — ${dueDateStr}`

        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
            <h2 style="margin-bottom:4px">Contract Service Due</h2>
            <p style="color:#475569;font-size:14px;margin-bottom:20px">${detail}. Schedule the next visit to keep this contract active.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:140px">Contract</td>
                <td style="padding:8px 12px">${contract.name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Client</td>
                <td style="padding:8px 12px">${contract.client}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Due Date</td>
                <td style="padding:8px 12px;font-weight:700;color:#d97706">${dueDateStr}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Days Remaining</td>
                <td style="padding:8px 12px">${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</td>
              </tr>
            </table>
            <p style="margin-top:28px;font-size:12px;color:#94a3b8">
              Log in to WorkForge to schedule a service visit or contact the client.
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
            errors.push(`contractRenewals: email failed for ${user.email} (contract ${contract.id}) — ${msg}`)
          }
        }
      }
    }
  }

  return { processed, errors }
}
