import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { emailAgentDigest } from '@/lib/email'

const DEV_EMAIL = process.env.AGENT_DIGEST_EMAIL ?? 'prios0815@gmail.com'

export async function POST(req: Request) {
  const secret = req.headers.get('x-agent-secret')
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    recentErrors,
    recentWarnings,
    totalUsers,
    activeUsers,
    totalJobs,
    jobsByStatus,
    totalInvoices,
    recentAuditActivity,
    orphanedJobs,
    invoicesWithNoTotal,
  ] = await Promise.all([
    // System errors in last 24h
    prisma.auditLog.findMany({
      where: { severity: 'error', createdAt: { gt: last24h } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, detail: true, createdAt: true },
    }),
    // Warnings in last 24h
    prisma.auditLog.findMany({
      where: { severity: 'warn', createdAt: { gt: last24h } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true, detail: true, createdAt: true },
    }),
    // Total user count
    prisma.user.count(),
    // Active users
    prisma.user.count({ where: { active: true } }),
    // Total jobs
    prisma.job.count(),
    // Jobs grouped by status
    prisma.job.groupBy({ by: ['status'], _count: true }),
    // Total invoices
    prisma.invoice.count(),
    // Audit log volume last 7 days
    prisma.auditLog.count({ where: { createdAt: { gt: last7d } } }),
    // Jobs with no client name (data integrity)
    prisma.job.findMany({
      where: { OR: [{ client: '' }, { type: '' }] },
      select: { id: true, client: true, status: true },
    }),
    // Invoices with zero or negative total (data integrity)
    prisma.invoice.findMany({
      where: { total: { lte: 0 } },
      select: { id: true, number: true, client: true, total: true },
    }),
  ])

  const systemHealth = {
    errors24h: recentErrors.length,
    warnings24h: recentWarnings.length,
    users: { total: totalUsers, active: activeUsers },
    jobs: {
      total: totalJobs,
      byStatus: Object.fromEntries(jobsByStatus.map(j => [j.status, j._count])),
    },
    invoices: { total: totalInvoices },
    auditActivity7d: recentAuditActivity,
    dataIssues: {
      orphanedJobs: orphanedJobs.length,
      badInvoices: invoicesWithNoTotal.length,
    },
    details: {
      recentErrors,
      recentWarnings,
      orphanedJobs,
      badInvoices: invoicesWithNoTotal,
    },
  }

  const hasIssues =
    recentErrors.length > 0 ||
    recentWarnings.length > 0 ||
    orphanedJobs.length > 0 ||
    invoicesWithNoTotal.length > 0

  const statusLabel = hasIssues ? '⚠️ Issues Detected' : '✅ All Clear'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: `You are a system monitoring agent for WorkForge, a field operations SaaS app. The developer (Paul) wants a technical health report. Analyze this system data and write a concise developer-focused digest. Flag any errors or data integrity issues clearly. If everything is clean, say so briefly. Format as HTML paragraphs only (no markdown, no headers). Data: ${JSON.stringify(systemHealth)}`,
      },
    ],
  })

  const aiText = message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate report.'

  const errorBadge = recentErrors.length > 0
    ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">${recentErrors.length} ERROR${recentErrors.length > 1 ? 'S' : ''}</span>`
    : `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">NO ERRORS</span>`

  const htmlBody = `
    <h2 style="margin-bottom:4px">WorkForge System Health</h2>
    <p style="color:#666;font-size:13px">${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} &bull; ${errorBadge}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px;width:160px">Errors (24h)</td>
        <td style="padding:8px 12px;font-size:13px;color:${recentErrors.length > 0 ? '#991b1b' : '#166534'}">${recentErrors.length}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Warnings (24h)</td>
        <td style="padding:8px 12px;font-size:13px">${recentWarnings.length}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Active Users</td>
        <td style="padding:8px 12px;font-size:13px">${activeUsers} / ${totalUsers}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Total Jobs</td>
        <td style="padding:8px 12px;font-size:13px">${totalJobs}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Audit Events (7d)</td>
        <td style="padding:8px 12px;font-size:13px">${recentAuditActivity}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Data Issues</td>
        <td style="padding:8px 12px;font-size:13px;color:${(orphanedJobs.length + invoicesWithNoTotal.length) > 0 ? '#991b1b' : '#166534'}">${orphanedJobs.length + invoicesWithNoTotal.length === 0 ? 'None' : `${orphanedJobs.length} bad jobs, ${invoicesWithNoTotal.length} bad invoices`}</td>
      </tr>
    </table>
    <div style="font-size:14px;line-height:1.6">${aiText}</div>
  `

  const subject = `${statusLabel} — WorkForge System Report`
  await emailAgentDigest(DEV_EMAIL, subject, htmlBody)

  await prisma.auditLog.create({
    data: {
      icon: '🤖',
      action: 'System health report sent',
      detail: `${recentErrors.length} errors, ${recentWarnings.length} warnings`,
      severity: 'info',
      userId: null,
    },
  })

  return Response.json({ ok: true, status: statusLabel, systemHealth })
}
