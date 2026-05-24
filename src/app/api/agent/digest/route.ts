import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { emailAgentDigest } from '@/lib/email'
import { apiError } from '@/lib/apiError'

const DEV_EMAIL = process.env.AGENT_DIGEST_EMAIL ?? 'Paul.WorkForge@gmail.com'
const BASE_URL  = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://workforge-production.up.railway.app').trim()

const ENDPOINTS = [
  { path: '/api/health',   method: 'GET', public: true  },
  { path: '/api/jobs',     method: 'GET', public: false },
  { path: '/api/invoices', method: 'GET', public: false },
  { path: '/api/users',    method: 'GET', public: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function fetchSentryDigest() {
  const dsn   = process.env.NEXT_PUBLIC_SENTRY_DSN
  const token = process.env.SENTRY_AUTH_TOKEN
  if (!dsn || !token) return null

  try {
    const match = dsn.match(/https:\/\/[^@]+@o(\d+)\.ingest[^/]+\/(\d+)/)
    if (!match) return null

    const orgsRes = await fetch('https://sentry.io/api/0/organizations/', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!orgsRes.ok) return null
    const orgs = await orgsRes.json() as Array<{ id: string; slug: string }>
    if (!orgs.length) return null
    const org = orgs[0]

    const projectsRes = await fetch(`https://sentry.io/api/0/organizations/${org.slug}/projects/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!projectsRes.ok) return null
    const projects = await projectsRes.json() as Array<{ id: string; slug: string }>
    if (!projects.length) return null
    const project = projects[0]

    const issuesRes = await fetch(
      `https://sentry.io/api/0/projects/${org.slug}/${project.slug}/issues/?query=is:unresolved&limit=25&sort=date`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) },
    )
    if (!issuesRes.ok) return null
    const issues = await issuesRes.json() as Array<{
      id: string; title: string; count: string; lastSeen: string; permalink: string
    }>

    // Issues seen in the last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const newToday  = issues.filter(i => new Date(i.lastSeen) > yesterday).length

    return {
      unresolvedTotal: issues.length,
      newInLast24h:    newToday,
      top: issues.slice(0, 3).map(i => ({
        title:    i.title.slice(0, 80),
        count:    Number(i.count),
        lastSeen: i.lastSeen,
        url:      i.permalink,
      })),
    }
  } catch {
    return null
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const secret = req.headers.get('x-agent-secret')
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return apiError('Unauthorized', 401)
  }

  const now      = new Date()
  const last24h  = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last48h  = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // Run all checks in parallel
  const [
    endpointResults,
    dbHealth,
    recentErrors,
    failedLogins,
    successfulLogins,
    // Business metrics — today
    jobsToday,
    paymentsToday,
    newUsersToday,
    // Business metrics — yesterday (for trend)
    jobsYesterday,
    paymentsYesterday,
    // Platform totals
    totalJobs,
    totalUsers,
    totalTenants,
    openJobs,
    // Sentry
    sentryData,
  ] = await Promise.all([
    Promise.all(ENDPOINTS.map(e => pingEndpoint(e.path, e.method, e.public))),
    checkDatabase(),
    prisma.auditLog.findMany({
      where: { severity: 'error', createdAt: { gt: last24h } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, detail: true, createdAt: true },
    }),
    prisma.auditLog.count({
      where: { action: { contains: 'Login' }, severity: 'error', createdAt: { gt: last24h } },
    }),
    prisma.auditLog.count({
      where: { action: 'Login', severity: 'info', createdAt: { gt: last24h } },
    }),
    // Today metrics
    prisma.job.count({ where: { createdAt: { gt: last24h } } }),
    prisma.payment.aggregate({
      where: { createdAt: { gt: last24h } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.count({ where: { createdAt: { gt: last24h } } }),
    // Yesterday metrics (for trends)
    prisma.job.count({ where: { createdAt: { gt: last48h, lt: last24h } } }),
    prisma.payment.aggregate({
      where: { createdAt: { gt: last48h, lt: last24h } },
      _sum: { amount: true },
      _count: true,
    }),
    // Totals
    prisma.job.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.tenant.count({ where: { active: true } }),
    prisma.job.count({ where: { status: { notIn: ['done'] } } }),
    // Sentry
    fetchSentryDigest(),
  ])

  const downEndpoints = endpointResults.filter(e => !e.ok)
  const slowEndpoints = endpointResults.filter(e => e.ok && e.ms > 3000)

  // Trend helpers
  const jobTrend    = jobsToday - jobsYesterday
  const revToday    = paymentsToday._sum.amount ?? 0
  const revYesterday = paymentsYesterday._sum.amount ?? 0
  const revTrend    = revToday - revYesterday
  const trendArrow  = (n: number) => n > 0 ? `↑ +${n}` : n < 0 ? `↓ ${n}` : '→ flat'
  const trendColor  = (n: number, goodIfPositive = true) => {
    if (n === 0) return '#6b7280'
    return (n > 0) === goodIfPositive ? '#166534' : '#991b1b'
  }

  const report = {
    timestamp: now.toISOString(),
    database:  dbHealth,
    endpoints: endpointResults,
    appErrors: { count: recentErrors.length, items: recentErrors },
    auth:      { failedLogins24h: failedLogins, successfulLogins24h: successfulLogins },
    business: {
      jobsToday,     jobsYesterday,
      paymentsToday: { count: paymentsToday._count, revenue: revToday },
      paymentsYesterday: { count: paymentsYesterday._count, revenue: revYesterday },
      newUsersToday,
      totals: { jobs: totalJobs, activeUsers: totalUsers, tenants: totalTenants, openJobs },
    },
    sentry: sentryData,
    issues: {
      downEndpoints:  downEndpoints.map(e => e.path),
      slowEndpoints:  slowEndpoints.map(e => ({ path: e.path, ms: e.ms })),
      databaseDown:   !dbHealth.ok,
      errorSpike:     recentErrors.length > 5,
      sentryErrors:   (sentryData?.newInLast24h ?? 0) > 0,
    },
  }

  const hasIssues =
    downEndpoints.length > 0 ||
    !dbHealth.ok ||
    recentErrors.length > 0 ||
    failedLogins > 10 ||
    slowEndpoints.length > 0 ||
    (sentryData?.newInLast24h ?? 0) > 3

  if (hasIssues) {
    Sentry.captureMessage('WorkForge agent detected platform issues', {
      level: 'warning',
      extra: report,
    })
  }

  const statusLabel = hasIssues ? '⚠️ Issues Detected' : '✅ All Systems Operational'

  // AI narrative — graceful fallback if API key unavailable
  let aiText = hasIssues
    ? `<p>Platform issues detected. Review the infrastructure table below.</p>`
    : `<p>All systems operational. No anomalies detected in the last 24 hours.</p>`

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content:
              `You are a monitoring agent reporting to Paul, the developer of WorkForge (a multi-tenant field ops SaaS). ` +
              `Write a brief technical + business health summary. ` +
              `Highlight: any down endpoints, slow responses, DB issues, error spikes, Sentry errors. ` +
              `Also briefly mention business activity trends (jobs created, revenue, logins). ` +
              `If all systems are clear, say so in one sentence then move to business highlights. ` +
              `Format as 2–4 short HTML paragraphs. No markdown. No bullet lists. ` +
              `Data: ${JSON.stringify(report)}`,
          },
        ],
      })
      if (message.content[0].type === 'text') aiText = message.content[0].text
    } catch {
      // AI unavailable — fallback text already set above
    }
  }

  // ─── Build email HTML ──────────────────────────────────────────────────────

  const cell = (label: string, value: string, color = '#333') =>
    `<tr>
      <td style="padding:7px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#374151;width:180px">${label}</td>
      <td style="padding:7px 14px;font-size:12px;color:${color}">${value}</td>
    </tr>`

  const endpointRows = endpointResults.map(e =>
    `<tr>
      <td style="padding:5px 12px;background:#f8fafc;font-size:11px;font-family:monospace">${e.path}</td>
      <td style="padding:5px 12px;font-size:11px;color:${e.ok ? '#166534' : '#991b1b'}">${e.status || 'TIMEOUT'}</td>
      <td style="padding:5px 12px;font-size:11px;color:${e.ms > 3000 ? '#92400e' : '#6b7280'}">${e.ms}ms</td>
    </tr>`,
  ).join('')

  const sentrySection = sentryData
    ? `<p style="font-size:13px;font-weight:600;color:#111827;margin:20px 0 8px">Sentry Error Tracker</p>
       <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
         ${cell('Unresolved total', `${sentryData.unresolvedTotal}`, sentryData.unresolvedTotal > 0 ? '#991b1b' : '#166534')}
         ${cell('New in last 24h', `${sentryData.newInLast24h}`, sentryData.newInLast24h > 0 ? '#b45309' : '#166534')}
         ${sentryData.top.map(i =>
           `<tr>
             <td style="padding:5px 14px;background:#f8fafc;font-size:11px;font-family:monospace">↳ ${i.title.slice(0, 55)}…</td>
             <td style="padding:5px 14px;font-size:11px;color:#6b7280">${i.count}× · <a href="${i.url}" style="color:#4f46e5">view</a></td>
           </tr>`
         ).join('')}
       </table>`
    : ''

  const htmlBody = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">

      <h2 style="margin:0 0 4px;font-size:18px">WorkForge Platform Health</h2>
      <p style="margin:0 0 20px;font-size:12px;color:#6b7280">
        ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
      </p>

      <!-- AI narrative -->
      <div style="background:#f0f9ff;border-left:3px solid #0ea5e9;padding:12px 16px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#0c4a6e">
        ${aiText}
      </div>

      <!-- Infrastructure -->
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px">Infrastructure</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${cell('Database', dbHealth.ok ? `✅ Connected (${dbHealth.ms}ms)` : `🔴 DOWN — ${dbHealth.error}`, dbHealth.ok ? '#166534' : '#991b1b')}
        ${cell('App Errors (24h)', `${recentErrors.length}`, recentErrors.length > 0 ? '#991b1b' : '#166534')}
        ${cell('Logins (24h)', `${successfulLogins} successful, ${failedLogins} failed`, failedLogins > 10 ? '#991b1b' : '#333')}
      </table>

      <!-- Endpoints -->
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px">Endpoint Health</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr style="background:#e5e7eb">
          <th style="padding:5px 12px;font-size:11px;text-align:left;font-weight:600">Endpoint</th>
          <th style="padding:5px 12px;font-size:11px;text-align:left;font-weight:600">Status</th>
          <th style="padding:5px 12px;font-size:11px;text-align:left;font-weight:600">Response</th>
        </tr>
        ${endpointRows}
      </table>

      <!-- Sentry -->
      ${sentrySection}

      <!-- Business metrics -->
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px">Business Activity (last 24h vs prior 24h)</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${cell('Jobs created', `${jobsToday} &nbsp;<span style="font-size:11px;color:${trendColor(jobTrend)}">${trendArrow(jobTrend)}</span>`)}
        ${cell('Revenue collected', `$${revToday.toLocaleString()} &nbsp;<span style="font-size:11px;color:${trendColor(revTrend)}">${trendArrow(Math.round(revTrend))}</span>`)}
        ${cell('New users', `${newUsersToday}`)}
        ${cell('Open jobs (all time)', `${openJobs}`)}
        ${cell('Platform totals', `${totalJobs} jobs · ${totalUsers} users · ${totalTenants} tenant${totalTenants !== 1 ? 's' : ''}`)}
      </table>

      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px">
        WorkForge Layer 3 AI Agent &nbsp;·&nbsp; ${BASE_URL}
      </p>
    </div>
  `

  await emailAgentDigest(DEV_EMAIL, `${statusLabel} — WorkForge Platform`, htmlBody)

  await prisma.auditLog.create({
    data: {
      icon:     '🤖',
      action:   'Platform health digest',
      detail:   hasIssues
        ? `Issues: ${downEndpoints.length} down, ${recentErrors.length} errors, ${sentryData?.newInLast24h ?? 0} Sentry events`
        : `All clear — ${jobsToday} jobs today, $${revToday.toLocaleString()} revenue`,
      severity: hasIssues ? 'warn' : 'info',
      userId:   null,
    },
  })

  return Response.json({ ok: true, status: statusLabel, hasIssues, report })
}
