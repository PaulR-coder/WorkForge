import { Resend } from 'resend'

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return Response.json({ error: 'RESEND_API_KEY not set' })

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'WorkForge <onboarding@resend.dev>',
    to: 'prios0815@gmail.com',
    subject: 'WorkForge test email',
    html: '<p>If you see this, email notifications are working.</p>',
  })

  return Response.json({ resendResult: result })
}
