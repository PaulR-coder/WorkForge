// WorkForge Service Worker
// CACHE_VERSION is stamped by scripts/patch-sw.mjs after each `next build`.
const CACHE_VERSION = 'wf-ei42a26szPeuhqd3pzuuG'
const STATIC_CACHE  = `${CACHE_VERSION}-static`
const PAGE_CACHE    = `${CACHE_VERSION}-pages`

const PAGE_MAX_AGE_MS = 7  * 24 * 60 * 60 * 1000
const API_MAX_AGE_MS  = 24 * 60 * 60 * 1000

// Never intercept: auth state, payments, push subscriptions, file uploads
const BYPASS_PREFIXES = [
  '/api/auth/',
  '/api/push/',
  '/api/billing/',
  '/api/seed',
  '/api/register',
  '/api/invites/accept',
]

// Headers that must not be replayed (browser-computed or Next.js-internal)
const STRIP_REPLAY_HEADERS = new Set([
  'cookie', 'content-length', 'host',
  'next-action', 'next-router-state-tree', 'next-router-prefetch', 'next-url',
  'rsc', 'next-action-upload-token',
])

// ─── Network Information API — adaptive page timeout ─────────────────────────

function getPageTimeout() {
  try {
    const t = { '4g': 5000, '3g': 10000, '2g': 14000, 'slow-2g': 20000 }
    return t[self.navigator?.connection?.effectiveType] ?? 6000
  } catch { return 6000 }
}

// ─── IndexedDB helpers ─────────────────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('workforge-offline', 2)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('api-cache')) {
        db.createObjectStore('api-cache', { keyPath: 'url' })
      }
      if (!db.objectStoreNames.contains('mutations')) {
        const s = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true })
        s.createIndex('queuedAt', 'queuedAt')
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = ()  => reject(req.error)
  })
}

function idbTx(db, name, mode = 'readonly') {
  return db.transaction([name], mode).objectStore(name)
}
function idbGet(db, store, key) {
  return new Promise((r, j) => { const q = idbTx(db, store).get(key); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error) })
}
function idbPut(db, store, val) {
  return new Promise((r, j) => { const q = idbTx(db, store, 'readwrite').put(val); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error) })
}
function idbAdd(db, store, val) {
  return new Promise((r, j) => { const q = idbTx(db, store, 'readwrite').add(val); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error) })
}
function idbGetAll(db, store) {
  return new Promise((r, j) => { const q = idbTx(db, store).getAll(); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error) })
}
function idbDelete(db, store, key) {
  return new Promise((r, j) => { const q = idbTx(db, store, 'readwrite').delete(key); q.onsuccess = () => r(); q.onerror = () => j(q.error) })
}
function idbClear(db, store) {
  return new Promise((r, j) => { const q = idbTx(db, store, 'readwrite').clear(); q.onsuccess = () => r(); q.onerror = () => j(q.error) })
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────────

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('wf-') && !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    if (BYPASS_PREFIXES.some(p => url.pathname.startsWith(p))) return
    if (request.method === 'GET') {
      event.respondWith(apiNetworkFirst(request))
    } else {
      event.respondWith(handleMutation(request))
    }
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(pageNetworkFirst(request))
  }
})

// ─── Strategies ─────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const hit   = await cache.match(request)
  if (hit) return hit
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    return new Response('', { status: 503 })
  }
}

// Network-first with adaptive timeout. The network fetch always runs to
// completion in the background — stale content is served on slow/dead
// connections but the cache is refreshed so the next load is always fresh.
async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGE_CACHE)

  // Navigate-mode requests inherit redirect:'manual' in WebKit and Chrome,
  // meaning server redirects (307 auth redirects etc.) come back as opaque
  // redirect responses (status:0, ok:false).  Chrome then served OFFLINE_PAGE;
  // WebKit rejected the response entirely with "has redirections".
  //
  // Fix: fetch by URL (not by Request) so mode defaults to 'same-origin'
  // and redirect defaults to 'follow'.  credentials:'include' ensures the
  // session cookie is sent so the server can evaluate auth state correctly.
  const fetchReq = request.mode === 'navigate'
    ? new Request(request.url, { credentials: 'include', redirect: 'follow' })
    : request

  const networkFetch = fetch(fetchReq)
    .then(res => { if (res.ok) cache.put(request.url, res.clone()); return res })
    .catch(() => null)

  const timeout = new Promise(resolve => setTimeout(() => resolve(null), getPageTimeout()))
  const fast    = await Promise.race([networkFetch, timeout])

  if (fast?.ok) return fast

  const stale = await cache.match(request.url)
  if (stale) {
    const dateStr  = stale.headers.get('date')
    const cacheAge = dateStr ? Date.now() - new Date(dateStr).getTime() : Infinity
    if (cacheAge <= PAGE_MAX_AGE_MS) {
      notifyAll({ type: 'WF_STALE_PAGE', cachedAt: dateStr ? new Date(dateStr).getTime() : null })
      return stale
    }
    await cache.delete(request.url)
  }

  const networkRes = await networkFetch
  if (networkRes?.ok) return networkRes
  return new Response(OFFLINE_PAGE, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

async function apiNetworkFirst(request) {
  const key = request.url
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 5000)
    const res  = await fetch(request.clone(), { signal: ctrl.signal })
    clearTimeout(tid)
    if (res.ok) {
      res.clone().json()
        .then(data => openIDB().then(db => idbPut(db, 'api-cache', { url: key, data, cachedAt: Date.now() })))
        .catch(() => {})
    }
    return res
  } catch {
    try {
      const db     = await openIDB()
      const cached = await idbGet(db, 'api-cache', key)
      if (cached && Date.now() - cached.cachedAt <= API_MAX_AGE_MS) {
        notifyAll({ type: 'WF_STALE_API', url: key, cachedAt: cached.cachedAt })
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-WF-Offline': '1' },
        })
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function handleMutation(request) {
  const url = new URL(request.url)

  // POST /api/jobs cannot be meaningfully queued — the server generates the ID
  // and the client uses it immediately. Return 503 so the client shows an error
  // rather than trying to use the queue response as a job object.
  if (request.method === 'POST' && url.pathname === '/api/jobs') {
    return new Response(JSON.stringify({ error: 'offline', cannotQueue: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Try the network first
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 8000)
    const res  = await fetch(request.clone(), { signal: ctrl.signal })
    clearTimeout(tid)
    return res
  } catch {
    // Offline — queue the mutation
    try {
      const body = await request.text()

      const headers = { 'content-type': 'application/json' }
      request.headers.forEach((v, k) => {
        if (!STRIP_REPLAY_HEADERS.has(k.toLowerCase())) headers[k] = v
      })
      // Stamp queue time — server uses this for optimistic lock conflict detection
      headers['x-wf-queued-at'] = new Date().toISOString()

      const db = await openIDB()
      await idbAdd(db, 'mutations', {
        url: request.url,
        method: request.method,
        body,
        headers,
        queuedAt: Date.now(),
      })

      // Notify clients so they can show a pending indicator on the job card
      const jobIdMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/)
      if (jobIdMatch) {
        notifyAll({ type: 'WF_MUTATION_QUEUED', jobId: jobIdMatch[1] })
      }

      if ('sync' in self.registration) {
        self.registration.sync.register('wf-sync').catch(() => {})
      }
    } catch {}

    return new Response(JSON.stringify({ ok: true, queued: true, offline: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'wf-sync') event.waitUntil(flushMutations())
})

async function flushMutations() {
  let db
  try { db = await openIDB() } catch { return }

  const all = await idbGetAll(db, 'mutations').catch(() => [])
  if (!all.length) return

  all.sort((a, b) => a.queuedAt - b.queuedAt)

  const done      = []
  const conflicts = []

  for (const m of all) {
    try {
      const res = await fetch(m.url, { method: m.method, headers: m.headers, body: m.body || undefined })

      if (res.ok) {
        done.push(m.id)

      } else if (res.status === 401) {
        // Session expired while offline. All remaining mutations will also fail.
        // Discard the entire queue rather than retrying forever.
        for (const remaining of all) {
          if (!done.includes(remaining.id)) done.push(remaining.id)
        }
        notifyAll({ type: 'WF_SESSION_EXPIRED' })
        break

      } else if (res.status === 404 || res.status === 403) {
        // Resource gone or permission revoked — discard, can't retry
        done.push(m.id)

      } else if (res.status === 409) {
        // Optimistic lock conflict — notify client, discard this mutation
        const body = await res.json().catch(() => ({}))
        conflicts.push({ mutation: { url: m.url, method: m.method, queuedAt: m.queuedAt }, server: body })
        done.push(m.id)

      } else {
        // 5xx or other server error — server is unhealthy, stop and retry later
        break
      }

    } catch {
      break // Network failure — stop here, retry on next sync event
    }
  }

  for (const id of done) {
    await idbDelete(db, 'mutations', id).catch(() => {})
  }

  if (conflicts.length > 0) {
    notifyAll({ type: 'WF_CONFLICTS', conflicts })
  }

  if (done.length > 0) {
    const remaining = (await idbGetAll(db, 'mutations').catch(() => [])).length
    notifyAll({ type: 'WF_SYNC_COMPLETE', synced: done.length, conflicts: conflicts.length, remaining })
  }
}

// ─── Messages from client ──────────────────────────────────────────────────────

function notifyAll(msg) {
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then(clients => clients.forEach(c => c.postMessage(msg)))
    .catch(() => {})
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'FLUSH_QUEUE') {
    event.waitUntil(flushMutations())
  }

  if (event.data?.type === 'GET_QUEUE_COUNT') {
    openIDB()
      .then(db => idbGetAll(db, 'mutations'))
      .then(all => event.source?.postMessage({ type: 'WF_QUEUE_COUNT', count: all.length }))
      .catch(() => event.source?.postMessage({ type: 'WF_QUEUE_COUNT', count: 0 }))
  }

  // Called on logout — wipes cached page HTML, API data, and mutation queue
  // so the next user on this device starts clean.
  if (event.data?.type === 'CLEAR_USER_DATA') {
    event.waitUntil(
      Promise.all([
        caches.delete(PAGE_CACHE),
        openIDB().then(db => Promise.all([
          idbClear(db, 'api-cache'),
          idbClear(db, 'mutations'),
        ])).catch(() => {}),
      ])
    )
  }
})

// ─── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(self.registration.showNotification(data.title ?? 'WorkForge', {
    body: data.body ?? '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: data.url ?? '/field' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/field'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

// ─── Offline fallback ──────────────────────────────────────────────────────────

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>WorkForge — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080c1a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center}
    .icon{font-size:52px;margin-bottom:20px}
    h1{font-size:22px;font-weight:800;color:#f59e0b;margin-bottom:10px}
    p{font-size:13px;color:#94a3b8;line-height:1.7;max-width:340px;margin:0 auto 24px}
    .btn{display:inline-block;padding:11px 24px;background:#f59e0b;color:#080c1a;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none;margin:4px}
    .btn-ghost{background:transparent;border:1px solid #334155;color:#94a3b8}
  </style>
</head>
<body>
  <div>
    <div class="icon">⚡</div>
    <h1>You're offline</h1>
    <p>Open a page you've already visited to keep working — your changes queue automatically and sync the moment you reconnect.</p>
    <button class="btn" onclick="history.back()">Go back</button>
    <button class="btn btn-ghost" onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`
