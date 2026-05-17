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
      <p>You've been invited to join <strong>${companyName}</strong> on WorkForge as a <strong>${role}</strong>.</p>
      <a href="${inviteUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#f59e0b;color:#080c1a;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none">Accept Invitation →</a>
      <p style="font-size:12px;color:#999">This invitation expires in 7 days. If you weren't expecting this, you can ignore it.</p>
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
