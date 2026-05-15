import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { emailAgentDigest } from '@/lib/email'

const ADMIN_EMAIL = process.env.AGENT_DIGEST_EMAIL ?? 'prios0815@gmail.com'

export async function POST(req: Request) {
  const secret = req.headers.get('x-agent-secret')
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [stalledJobs, unassignedJobs, overdueInvoices, recentErrors] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: ['open', 'in_progress'] }, updatedAt: { lt: threeDaysAgo } },
      select: { id: true, client: true, status: true, type: true, updatedAt: true },
    }),
    prisma.job.findMany({
      where: { techId: null, status: 'open' },
      select: { id: true, client: true, type: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { status: 'sent', updatedAt: { lt: sevenDaysAgo } },
      select: { id: true, number: true, client: true, total: true, updatedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { severity: 'error', createdAt: { gt: sevenDaysAgo } },
      select: { action: true, detail: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const summary = {
    stalledJobs: stalledJobs.length,
    unassignedJobs: unassignedJobs.length,
    overdueInvoices: overdueInvoices.length,
    recentErrors: recentErrors.length,
    details: { stalledJobs, unassignedJobs, overdueInvoices, recentErrors },
  }

  if (
    summary.stalledJobs === 0 &&
    summary.unassignedJobs === 0 &&
    summary.overdueInvoices === 0 &&
    summary.recentErrors === 0
  ) {
    return Response.json({ ok: true, message: 'Nothing to report' })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are the WorkForge operations agent. Analyze this field operations data and write a concise digest for the owner. Be direct, flag anything urgent, and suggest one action per issue. Format as HTML paragraphs (no markdown). Data: ${JSON.stringify(summary)}`,
      },
    ],
  })

  const aiText = message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate digest.'

  const htmlBody = `
    <h2 style="margin-bottom:4px">Daily Operations Digest</h2>
    <p style="color:#666;font-size:13px">${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <div style="background:#f5f7fa;border-left:4px solid #6c63ff;padding:12px 16px;margin:16px 0;border-radius:4px">
      <strong>Summary:</strong> ${summary.stalledJobs} stalled jobs &bull; ${summary.unassignedJobs} unassigned &bull; ${summary.overdueInvoices} overdue invoices &bull; ${summary.recentErrors} errors
    </div>
    <div style="font-size:14px;line-height:1.6">${aiText}</div>
  `

  const subject = `Daily Digest — ${summary.stalledJobs + summary.unassignedJobs} jobs need attention`
  await emailAgentDigest(ADMIN_EMAIL, subject, htmlBody)

  await prisma.auditLog.create({
    data: {
      icon: '🤖',
      action: 'Agent digest sent',
      detail: `${summary.stalledJobs} stalled, ${summary.unassignedJobs} unassigned, ${summary.overdueInvoices} overdue invoices`,
      severity: 'info',
      userId: null,
    },
  })

  return Response.json({ ok: true, summary })
}
