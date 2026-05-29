import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'WorkForge <no-reply@getworkforge.com>'

function baseTemplate(body: string, { marketing = false }: { marketing?: boolean } = {}) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
      ${body}
      <div style="margin-top:32px;border-top:1px solid #eee;padding-top:16px">
        <p style="color:#999;font-size:11px;margin:0 0 6px">
          WorkForge Field Operations · 11814 Whisper Creek Dr, Riverview, FL 33569
        </p>
        <p style="color:#bbb;font-size:11px;margin:0">
          ${marketing
            ? 'You received this email because you opted in to WorkForge updates. <a href="%unsubscribe_url%" style="color:#bbb">Unsubscribe</a>.'
            : 'This is a transactional email related to your WorkForge account.'}
        </p>
      </div>
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

export async function emailVerification(to: string, name: string, verifyUrl: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: '[WorkForge] Verify your email — one click to go live',
    html: baseTemplate(`
      <h2 style="margin-bottom:4px">Hi ${name},</h2>
      <p style="margin-bottom:20px">Thanks for creating a WorkForge workspace. Click the button below to verify your email and activate your account.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin-bottom:28px;padding:13px 32px;background:#f59e0b;color:#080c1a;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none">Verify Email →</a>
      <div style="background:#f5f7fa;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="font-weight:700;font-size:13px;margin-bottom:10px">What to do after verifying:</p>
        <p style="font-size:13px;margin-bottom:6px">🧑‍🔧 <strong>Invite your team</strong> — add dispatchers and technicians so they can receive jobs on their phones</p>
        <p style="font-size:13px;margin-bottom:6px">🔧 <strong>Create a work order</strong> — assign jobs to techs and track them from open to complete</p>
        <p style="font-size:13px;margin-bottom:0">💰 <strong>Collect payments</strong> — techs can collect payment in the field directly from the app</p>
      </div>
      <p style="font-size:12px;color:#999">This link expires in 24 hours. If you didn't create a WorkForge account, you can safely ignore this email.</p>
      <p style="font-size:11px;color:#bbb;word-break:break-all">Or copy this link: ${verifyUrl}</p>
    `),
  }).catch(console.error)
}

export async function emailPasswordReset(to: string, name: string, resetUrl: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: '[WorkForge] Reset your password',
    html: baseTemplate(`
      <h2 style="margin-bottom:4px">Hi ${name},</h2>
      <p>We received a request to reset your password. Click the button below to set a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#f59e0b;color:#080c1a;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none">Reset Password →</a>
      <p style="font-size:12px;color:#999">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password has not changed.</p>
    `),
  }).catch(console.error)
}

export async function emailInvite(to: string, companyName: string, role: string, inviteUrl: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[WorkForge] You've been invited to join ${companyName}`,
    html: baseTemplate(`
      <h2 style="margin-bottom:4px">You're invited!</h2>
      <p>An administrator at <strong>${companyName}</strong> has invited you to join their workspace on WorkForge as a <strong>${role}</strong>.</p>
      <a href="${inviteUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#f59e0b;color:#080c1a;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none">Accept Invitation →</a>
      <p style="font-size:12px;color:#999">This invitation expires in 7 days. If you weren't expecting this invite, you can safely ignore this email — no account will be created without your action.</p>
    `),
  }).catch(console.error)
}

export async function emailSubscriptionConfirmation(
  to: string,
  name: string,
  tenantName: string,
  renewDate: string,
  portalUrl: string,
) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: '[WorkForge] Subscription confirmed — you\'re all set',
    html: baseTemplate(`
      <h2 style="margin-bottom:4px">Hi ${name},</h2>
      <p>Your WorkForge Pro subscription for <strong>${tenantName}</strong> is now active.</p>
      ${table([
        ['Plan', 'WorkForge Pro'],
        ['Billing', '$39/mo base + $12/user/mo'],
        ['Renews', renewDate],
        ['Cancellation', 'Anytime — no penalty'],
      ])}
      <p style="margin-top:20px;font-size:13px">To manage your subscription, update payment info, or cancel, visit your billing portal:</p>
      <a href="${portalUrl}" style="display:inline-block;margin:12px 0 20px;padding:11px 24px;background:#f59e0b;color:#080c1a;border-radius:10px;font-weight:800;font-size:13px;text-decoration:none">Manage Billing →</a>
      <p style="font-size:12px;color:#999">Questions? Contact us at support@getworkforge.com</p>
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

type EstimateLineItem = { description: string; hours?: number; qty?: number; unitPrice: number; total: number }

export async function emailEstimate(
  to: string,
  companyName: string,
  estimate: { number: string; client: string; jobType: string; description: string; lineItems: EstimateLineItem[]; subtotal: number },
  approvalUrl: string,
) {
  if (!resend) return
  const lineItemsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <thead>
        <tr style="background:#f5f7fa">
          <th style="text-align:left;padding:8px 10px;font-weight:700;color:#64748b">Description</th>
          <th style="text-align:right;padding:8px 10px;font-weight:700;color:#64748b">Total</th>
        </tr>
      </thead>
      <tbody>
        ${estimate.lineItems.map(item => `
          <tr style="border-bottom:1px solid #f0f0f0">
            <td style="padding:9px 10px">
              ${item.description}
              ${item.hours ? `<span style="color:#94a3b8;font-size:11px"> · ${item.hours}hr</span>` : ''}
              ${item.qty ? `<span style="color:#94a3b8;font-size:11px"> · qty ${item.qty}</span>` : ''}
            </td>
            <td style="padding:9px 10px;text-align:right;font-weight:600">$${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr style="background:#f8fafc">
          <td style="padding:12px 10px;font-weight:800;font-size:15px">Total</td>
          <td style="padding:12px 10px;text-align:right;font-weight:800;font-size:15px;color:#16a34a">$${estimate.subtotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  `
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${companyName} sent you an estimate — $${estimate.subtotal.toFixed(2)}`,
    html: baseTemplate(`
      <div style="background:#f59e0b;border-radius:10px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:#080c1a;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Service Estimate</div>
        <div style="font-size:22px;font-weight:800;color:#080c1a">${companyName}</div>
        <div style="font-size:13px;color:#1a1a2e;margin-top:4px;opacity:.8">${estimate.number}</div>
      </div>

      <p style="font-size:14px;color:#334155;line-height:1.6">Hi ${estimate.client},</p>
      <p style="font-size:14px;color:#334155;line-height:1.6">
        We've prepared a <strong>${estimate.jobType || 'service'}</strong> estimate for you.
        ${estimate.description ? `Here's what we'll be working on: <em>${estimate.description}</em>` : ''}
      </p>

      ${lineItemsHtml}

      <p style="font-size:13px;color:#64748b;margin-bottom:24px">
        Please review the estimate above and let us know if you'd like to proceed.
      </p>

      <div style="display:flex;gap:12px;margin-bottom:28px">
        <a href="${approvalUrl}?action=approve" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#fff;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;margin-right:10px">
          ✓ Approve Estimate
        </a>
        <a href="${approvalUrl}?action=decline" style="display:inline-block;padding:14px 20px;background:#f1f5f9;color:#64748b;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
          Decline
        </a>
      </div>

      <p style="font-size:11px;color:#94a3b8">
        This estimate expires in 30 days. Questions? Reply to this email or contact us directly.
      </p>
    `),
  }).catch(console.error)
}

export async function emailInvoiceToClient(
  to: string,
  companyName: string,
  invoice: { number: string; client: string; labor: number; parts: number; surcharge: number; total: number; dueDate: Date | string },
) {
  if (!resend) return
  const due = new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${invoice.number} from ${companyName} — $${invoice.total.toFixed(2)} due ${due}`,
    html: baseTemplate(`
      <div style="background:#1e293b;border-radius:10px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Invoice</div>
        <div style="font-size:22px;font-weight:800;color:#f8fafc">${companyName}</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:4px">${invoice.number} · Due ${due}</div>
      </div>

      <p style="font-size:14px;color:#334155;line-height:1.6">Hi ${invoice.client},</p>
      <p style="font-size:14px;color:#334155;line-height:1.6;margin-bottom:20px">
        Thank you for choosing ${companyName}. Please find your invoice details below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px">
        ${invoice.labor > 0 ? `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569">Labor</td><td style="padding:10px 12px;text-align:right">$${invoice.labor.toFixed(2)}</td></tr>` : ''}
        ${invoice.parts > 0 ? `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569">Parts &amp; Materials</td><td style="padding:10px 12px;text-align:right">$${invoice.parts.toFixed(2)}</td></tr>` : ''}
        ${invoice.surcharge > 0 ? `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569">Service Surcharge</td><td style="padding:10px 12px;text-align:right">$${invoice.surcharge.toFixed(2)}</td></tr>` : ''}
        <tr style="background:#f0fdf4">
          <td style="padding:14px 12px;font-weight:800;font-size:15px;color:#15803d">Total Due</td>
          <td style="padding:14px 12px;text-align:right;font-weight:800;font-size:15px;color:#15803d">$${invoice.total.toFixed(2)}</td>
        </tr>
      </table>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#854d0e">
        <strong>Payment due:</strong> ${due} — Please contact us to arrange payment via card, check, or bank transfer.
      </div>

      <p style="font-size:12px;color:#94a3b8">Questions about this invoice? Reply to this email or contact us directly.</p>
    `),
  }).catch(console.error)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

type AppointmentJob = {
  id: string
  client: string
  address: string
  type: string
  scheduledAt: Date | string
  tech?: { name: string } | null
}

export async function emailAppointmentConfirmation(
  to: string,
  companyName: string,
  job: AppointmentJob
): Promise<void> {
  if (!resend || !to) return
  const date = new Date(job.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const time = new Date(job.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Appointment Confirmed — ${escapeHtml(job.type)} on ${date}`,
    html: baseTemplate(`
      <h2 style="color:#050810;margin-bottom:4px">Appointment Confirmed ✓</h2>
      <p style="color:#666;margin-top:0">${escapeHtml(companyName)}</p>
      <div style="background:#f8f9fa;border-radius:10px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Service:</strong> ${escapeHtml(job.type)}</p>
        <p style="margin:0 0 8px"><strong>Client:</strong> ${escapeHtml(job.client)}</p>
        <p style="margin:0 0 8px"><strong>Address:</strong> ${escapeHtml(job.address)}</p>
        <p style="margin:0 0 8px"><strong>Date:</strong> ${date}</p>
        <p style="margin:0 0 8px"><strong>Time:</strong> ${time}</p>
        ${job.tech ? `<p style="margin:0"><strong>Technician:</strong> ${escapeHtml(job.tech.name)}</p>` : ''}
      </div>
      <p style="color:#666;font-size:13px">If you need to reschedule, please contact us directly.</p>
    `),
  }).catch(console.error)
}

export async function emailAppointmentReminder(
  to: string,
  companyName: string,
  job: AppointmentJob
): Promise<void> {
  if (!resend || !to) return
  const date = new Date(job.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const time = new Date(job.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: ${escapeHtml(job.type)} tomorrow at ${time}`,
    html: baseTemplate(`
      <h2 style="color:#050810;margin-bottom:4px">Appointment Tomorrow</h2>
      <p style="color:#666;margin-top:0">${escapeHtml(companyName)}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Service:</strong> ${escapeHtml(job.type)}</p>
        <p style="margin:0 0 8px"><strong>Address:</strong> ${escapeHtml(job.address)}</p>
        <p style="margin:0 0 8px"><strong>Date:</strong> ${date}</p>
        <p style="margin:0 0 8px"><strong>Time:</strong> ${time}</p>
        ${job.tech ? `<p style="margin:0"><strong>Technician:</strong> ${escapeHtml(job.tech.name)}</p>` : ''}
      </div>
      <p style="color:#666;font-size:13px">This is an automated reminder from ${escapeHtml(companyName)}.</p>
    `),
  }).catch(console.error)
}
