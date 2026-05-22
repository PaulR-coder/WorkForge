/**
 * GET /api/cron
 *
 * Background job runner endpoint.  Intended to be called by a scheduled
 * cron service (e.g. Railway cron, Vercel cron, GitHub Actions).
 *
 * Security:
 *  • If CRON_SECRET env var is set → caller must supply
 *    `Authorization: Bearer <CRON_SECRET>`.
 *  • If CRON_SECRET is not set → only localhost/127.0.0.1 is allowed
 *    (development / manual testing).
 */

import { runAllWorkers } from '@/lib/workers'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

function getClientIp(headerStore: Awaited<ReturnType<typeof headers>>): string {
  return (
    headerStore.get('x-real-ip') ??
    headerStore.get('x-forwarded-for')?.split(',')[0].trim() ??
    '127.0.0.1'
  )
}

function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}

export async function GET(request: Request) {
  const ts = () => new Date().toISOString()
  console.log(`[cron] ${ts()} — request received`)

  const headerStore = await headers()
  const cronSecret = process.env.CRON_SECRET

  // ── Auth ──────────────────────────────────────────────────────────────
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') ?? ''
    const provided = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''

    if (provided !== cronSecret) {
      console.warn(`[cron] ${ts()} — unauthorized (bad/missing secret)`)
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // No secret configured — restrict to localhost only
    const ip = getClientIp(headerStore)
    if (!isLocalhost(ip)) {
      console.warn(`[cron] ${ts()} — forbidden: CRON_SECRET not set and request from non-localhost IP: ${ip}`)
      return Response.json(
        { ok: false, error: 'CRON_SECRET is not configured. Remote access is disabled until a secret is set.' },
        { status: 403 },
      )
    }
    console.log(`[cron] ${ts()} — no CRON_SECRET set, allowing localhost request`)
  }

  // ── Run workers ───────────────────────────────────────────────────────
  try {
    console.log(`[cron] ${ts()} — starting workers`)
    const results = await runAllWorkers()
    console.log(`[cron] ${ts()} — finished`, JSON.stringify({
      pmAlerts: { processed: results.pmAlerts.processed, errors: results.pmAlerts.errors.length },
      invoiceReminders: { processed: results.invoiceReminders.processed, errors: results.invoiceReminders.errors.length },
      contractRenewals: { processed: results.contractRenewals.processed, errors: results.contractRenewals.errors.length },
    }))

    return Response.json({
      ok: true,
      ranAt: results.ranAt,
      results: {
        pmAlerts: results.pmAlerts,
        invoiceReminders: results.invoiceReminders,
        contractRenewals: results.contractRenewals,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[cron] ${ts()} — unhandled error:`, err)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
