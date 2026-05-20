// Tracks job IDs that have mutations queued in the SW but not yet synced.
// Persisted to localStorage so indicators survive page reloads while offline.
// Fires a DOM event on every change so board/field views update reactively
// without needing a shared React context.

const LS_KEY   = 'wf-pending-jobs'
const DOM_EVENT = 'wf-pending-update'

function getAll(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}

function persist(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent(DOM_EVENT, { detail: { jobIds: ids } }))
}

export function addPendingJob(jobId: string) {
  const all = getAll()
  if (!all.includes(jobId)) persist([...all, jobId])
}

export function removePendingJob(jobId: string) {
  persist(getAll().filter(id => id !== jobId))
}

export function clearPendingJobs() {
  localStorage.removeItem(LS_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DOM_EVENT, { detail: { jobIds: [] } }))
  }
}

export function getPendingJobs(): string[] {
  return getAll()
}

/** Hook-compatible: returns a Set and re-renders on change. */
export function subscribePendingJobs(cb: (ids: Set<string>) => void): () => void {
  const handler = (e: Event) => {
    cb(new Set((e as CustomEvent<{ jobIds: string[] }>).detail.jobIds))
  }
  window.addEventListener(DOM_EVENT, handler)
  return () => window.removeEventListener(DOM_EVENT, handler)
}
