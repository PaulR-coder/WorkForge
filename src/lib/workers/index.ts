/**
 * Worker orchestrator
 *
 * Calls all background workers and aggregates results.
 * Each worker is wrapped in an independent try/catch so a single
 * failure does not prevent the others from running.
 */

import { runPmAlerts } from './pmAlerts'
import { runInvoiceReminders } from './invoiceReminders'
import { runContractRenewals } from './contractRenewals'
import type { WorkerResult } from './pmAlerts'

export interface AllWorkersResult {
  pmAlerts: WorkerResult
  invoiceReminders: WorkerResult
  contractRenewals: WorkerResult
  ranAt: string
}

const EMPTY: WorkerResult = { processed: 0, errors: [] }

export async function runAllWorkers(): Promise<AllWorkersResult> {
  const ranAt = new Date().toISOString()

  const [pmAlerts, invoiceReminders, contractRenewals] = await Promise.all([
    runPmAlerts().catch((err): WorkerResult => {
      const msg = err instanceof Error ? err.message : String(err)
      return { ...EMPTY, errors: [`pmAlerts crashed: ${msg}`] }
    }),
    runInvoiceReminders().catch((err): WorkerResult => {
      const msg = err instanceof Error ? err.message : String(err)
      return { ...EMPTY, errors: [`invoiceReminders crashed: ${msg}`] }
    }),
    runContractRenewals().catch((err): WorkerResult => {
      const msg = err instanceof Error ? err.message : String(err)
      return { ...EMPTY, errors: [`contractRenewals crashed: ${msg}`] }
    }),
  ])

  return { pmAlerts, invoiceReminders, contractRenewals, ranAt }
}
