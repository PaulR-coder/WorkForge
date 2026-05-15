import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { emailAgentDigest } from '@/lib/email'

const DEV_EMAIL = process.env.AGENT_DIGEST_EMAIL ?? 'prios0815@gmail.com'
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

const ENDPOINTS = [
  { path: '/api/health', method: 'GET', public: true },
  { path: '/api/jobs', method: 'GET', public: false },
  { path: '/api/invoices', method: 'GET', public: false },
  { path: '/api/users', method: 'GET', public: false },
]

async function pingEndpoint(path: string, method: string, isPublic: boolean) {
  const start = Date.now()
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: isPublic ? {} : { Cookie: '' },
      signal: AbortSignal.timeout(8000),
    })
    return {
      path,
      status: res.status,
      ms: Date.now() - start,
      ok: isPublic ? res.status < 500 : res.status !== 500,
    }
  } catch (err) {
    return { path, status: 0, ms: Date.now() - start, ok: false, error: String(err) }
  }
}

async function checkDatabase() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, ms: Date.now() - start }
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: String(err) }
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-agent-secret')
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [endpointResults, dbHealth, recentErrors, failedLogins] = await Promise.all([
    Promise.all(ENDPOINTS.map(e => pingEndpoint(e.path, e.method, e.public))),
    checkDatabase(),
    prisma.auditLog.findMany({
      where: { severity: 'error', createdAt: { gt: last24h } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, detail: true, createdAt: true },
    }),
    prisma.auditLog.count({
      where: {
        action: 'Login',
        severity: 'error',
        createdAt: { gt: last24h },
      },
    }),
  ])

  const downEndpoints = endpointResults.filter(e => !e.ok)
  const slowEndpoints = endpointResults.filter(e => e.ok && e.ms > 3000)

  const report = {
    timestamp: now.toISOString(),
    database: dbHealth,
    endpoints: endpointResults,
    appErrors: {
      count: recentErrors.length,
      items: recentErrors,
    },
    auth: {
      failedLogins24h: failedLogins,
    },
    issues: {
      downEndpoints: downEndpoints.map(e => e.path),
      slowEndpoints: slowEndpoints.map(e => ({ path: e.path, ms: e.ms })),
      databaseDown: !dbHealth.ok,
      errorSpike: recentErrors.length > 5,
    },
  }

  const hasIssues =
    downEndpoints.length > 0 ||
    !dbHealth.ok ||
    recentErrors.length > 0 ||
    failedLogins > 10 ||
    slowEndpoints.length > 0

  if (hasIssues) {
    Sentry.captureMessage('WorkForge agent detected platform issues', {
      level: 'warning',
      extra: report,
    })
  }

  const statusLabel = hasIssues ? '⚠️ Issues Detected' : '✅ All Systems Operational'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `You are a system monitoring agent for WorkForge, a multi-tenant SaaS platform. Paul (the developer) wants a brief technical health report. Focus only on platform health — not tenant data. Highlight any down endpoints, slow responses, DB issues, or error spikes. If all clear, say so in one sentence. Format as HTML paragraphs only (no markdown). Data: ${JSON.stringify(report)}`,
      },
    ],
  })

  const aiText = message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate report.'

  const endpointRows = endpointResults.map(e => `
    <tr>
      <td style="padding:6px 12px;background:#f5f7fa;font-size:12px;font-family:monospace">${e.path}</td>
      <td style="padding:6px 12px;font-size:12px;color:${e.ok ? '#166534' : '#991b1b'}">${e.status || 'TIMEOUT'}</td>
      <td style="padding:6px 12px;font-size:12px;color:${e.ms > 3000 ? '#92400e' : '#333'}">${e.ms}ms</td>
    </tr>
  `).join('')

  const htmlBody = `
    <h2 style="margin-bottom:4px">WorkForge Platform Health</h2>
    <p style="color:#666;font-size:13px">${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px;width:160px">Database</td>
        <td style="padding:8px 12px;font-size:13px;color:${dbHealth.ok ? '#166534' : '#991b1b'}">${dbHealth.ok ? `Connected (${dbHealth.ms}ms)` : `DOWN — ${dbHealth.error}`}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">App Errors (24h)</td>
        <td style="padding:8px 12px;font-size:13px;color:${recentErrors.length > 0 ? '#991b1b' : '#166534'}">${recentErrors.length}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fa;font-weight:600;font-size:13px">Failed Logins (24h)</td>
        <td style="padding:8px 12px;font-size:13px;color:${failedLogins > 10 ? '#991b1b' : '#333'}">${failedLogins}</td>
      </tr>
    </table>

    <p style="font-weight:600;font-size:13px;margin-bottom:4px">Endpoint Health</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr style="background:#e5e7eb">
        <th style="padding:6px 12px;font-size:12px;text-align:left">Endpoint</th>
        <th style="padding:6px 12px;font-size:12px;text-align:left">Status</th>
        <th style="padding:6px 12px;font-size:12px;text-align:left">Response</th>
      </tr>
      ${endpointRows}
    </table>

    <div style="font-size:14px;line-height:1.6">${aiText}</div>
  `

  await emailAgentDigest(DEV_EMAIL, `${statusLabel} — WorkForge Platform`, htmlBody)

  await prisma.auditLog.create({
    data: {
      icon: '🤖',
      action: 'Platform health check',
      detail: hasIssues ? `Issues: ${downEndpoints.length} down, ${recentErrors.length} errors` : 'All systems operational',
      severity: hasIssues ? 'warn' : 'info',
      userId: null,
    },
  })

  return Response.json({ ok: true, status: statusLabel, hasIssues, report })
}
