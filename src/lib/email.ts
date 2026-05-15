import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'WorkForge <no-reply@workforge.io>'

function baseTemplate(body: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
      ${body}
      <p style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
        WorkForge Field Operations
      </p>
    </div>
  `
}

function table(rows: [string, string][]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      ${rows.map(([label, val]) => `
        <tr>
          <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px;width:120px">${label}</td>
          <td style="padding:8px 12px;font-size:13px">${val}</td>
        </tr>
      `).join('')}
    </table>
  `
}

export async function emailJobAssigned(
  to: string,
  name: string,
  job: { client: string; address: string; type: string; priority: string },
) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[WorkForge] New job assigned — ${job.client}`,
    html: baseTemplate(`
      <h2 style="margin-bottom:4px">Hi ${name},</h2>
      <p>You've been assigned a new job:</p>
      ${table([
        ['Client', job.client],
        ['Address', job.address],
        ['Type', job.type],
        ['Priority', job.priority],
      ])}
    `),
  }).catch(console.error)
}

export async function emailJobCompleted(
  to: string[],
  job: { client: string; address: string; type: string },
) {
  if (!resend || !to.length) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[WorkForge] Job complete — ${job.client}`,
    html: baseTemplate(`
      <h2>Job marked complete</h2>
      ${table([
        ['Client', job.client],
        ['Address', job.address],
        ['Type', job.type],
      ])}
    `),
  }).catch(console.error)
}

export async function emailAgentDigest(to: string, subject: string, htmlBody: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[WorkForge Agent] ${subject}`,
    html: baseTemplate(htmlBody),
  }).catch(console.error)
}

export async function emailInvoiceUpdate(
  to: string[],
  invoice: { number: string; client: string; total: number },
  status: string,
) {
  if (!resend || !to.length) return
  const label = status === 'paid' ? 'Invoice Paid' : 'Invoice Sent'
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[WorkForge] ${label} — ${invoice.number}`,
    html: baseTemplate(`
      <h2>${label}</h2>
      ${table([
        ['Invoice', invoice.number],
        ['Client', invoice.client],
        ['Total', `$${invoice.total.toFixed(2)}`],
      ])}
    `),
  }).catch(console.error)
}
