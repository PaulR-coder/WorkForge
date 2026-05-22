/**
 * Invoice Reminders worker
 *
 * Finds invoices that are:
 *   • status === 'overdue'  (explicitly marked overdue), OR
 *   • status === 'sent' AND dueDate is in the past
 *
 * For each, creates an audit log entry and optionally sends a reminder
 * email to the client contact email stored on the invoice.
 */

import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export interface WorkerResult {
  processed: number
  errors: string[]
}

export async function runInvoiceReminders(): Promise<WorkerResult> {
  const errors: string[] = []
  let processed = 0

  const now = new Date()

  // ── 1. Fetch overdue invoices ────────────────────────────────────────────
  let invoices: {
    id: string
    number: string
    client: string
    clientEmail: string
    total: number
    dueDate: Date
    status: string
    tenantId: string | null
  }[] = []

  try {
    invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { status: 'overdue' },
          { status: 'sent', dueDate: { lt: now } },
        ],
      },
      select: {
        id: true,
        number: true,
        client: true,
        clientEmail: true,
        total: true,
        dueDate: true,
        status: true,
        tenantId: true,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`invoiceReminders: failed to query invoices — ${msg}`)
    return { processed, errors }
  }

  if (invoices.length === 0) return { processed, errors }

  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null
  const FROM = 'alerts@getworkforge.com'

  // ── 2. Process each overdue invoice ────────────────────────────────────
  for (const invoice of invoices) {
    const msOverdue = now.getTime() - invoice.dueDate.getTime()
    const daysOverdue = Math.max(0, Math.floor(msOverdue / (1000 * 60 * 60 * 24)))

    const dueDateStr = invoice.dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    const detail =
      daysOverdue > 0
        ? `Invoice #${invoice.number} for ${invoice.client} is overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`
        : `Invoice #${invoice.number} for ${invoice.client} was due on ${dueDateStr}`

    // ── Audit log entry ──────────────────────────────────────────────────
    try {
      await prisma.auditLog.create({
        data: {
          icon: '💰',
          action: 'Invoice Overdue',
          detail,
          severity: 'warn',
          tenantId: invoice.tenantId,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`invoiceReminders: failed to write audit log for invoice ${invoice.id} — ${msg}`)
      continue
    }

    processed++

    // ── Email reminder to client ─────────────────────────────────────────
    if (resend && invoice.clientEmail) {
      const subject = `Payment Reminder: Invoice #${invoice.number} — $${invoice.total.toFixed(2)}`

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
          <h2 style="margin-bottom:4px">Payment Reminder</h2>
          <p style="color:#475569;font-size:14px;margin-bottom:20px">
            Hi ${invoice.client}, this is a friendly reminder that payment is overdue on the following invoice.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:140px">Invoice #</td>
              <td style="padding:8px 12px">${invoice.number}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Client</td>
              <td style="padding:8px 12px">${invoice.client}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Amount Due</td>
              <td style="padding:8px 12px;font-weight:700;color:#dc2626">$${invoice.total.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Due Date</td>
              <td style="padding:8px 12px;color:#dc2626">${dueDateStr}${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''}</td>
            </tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#475569">
            Please arrange payment at your earliest convenience. Contact us if you have any questions.
          </p>
          <p style="margin-top:28px;font-size:11px;color:#94a3b8">
            WorkForge Field Operations · 11814 Whisper Creek Dr, Riverview, FL 33569
          </p>
        </div>
      `

      try {
        await resend.emails.send({
          from: FROM,
          to: invoice.clientEmail,
          subject,
          html,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`invoiceReminders: email failed for invoice ${invoice.id} (${invoice.clientEmail}) — ${msg}`)
      }
    }
  }

  return { processed, errors }
}
