// WorkForge Service Worker — offline-first PWA
// Bump CACHE_VERSION on each deploy to evict stale caches
const CACHE_VERSION = 'wf-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGE_CACHE   = `${CACHE_VERSION}-pages`

// These paths are never intercepted: auth state, billing, push subscription
const BYPASS_PREFIXES = [
  '/api/auth/',
  '/api/push/',
  '/api/billing/',
  '/api/seed',
  '/api/register',
  '/api/invites/accept',
]

// ─── IndexedDB helpers (no ES modules in SW) ─────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('workforge-offline', 1)
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
    req.onerror  = ()  => reject(req.error)
  })
}

function idbStore(db, name, mode = 'readonly') {
  return db.transaction([name], mode).objectStore(name)
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const r = idbStore(db, store).get(key)
    r.onsuccess = () => resolve(r.result)
    r.onerror   = () => reject(r.error)
  })
}

function idbPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const r = idbStore(db, store, 'readwrite').put(value)
    r.onsuccess = () => resolve(r.result)
    r.onerror   = () => reject(r.error)
  })
}

function idbAdd(db, store, value) {
  return new Promise((resolve, reject) => {
    const r = idbStore(db, store, 'readwrite').add(value)
    r.onsuccess = () => resolve(r.result)
    r.onerror   = () => reject(r.error)
  })
}

function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const r = idbStore(db, store).getAll()
    r.onsuccess = () => resolve(r.result)
    r.onerror   = () => reject(r.error)
  })
}

function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const r = idbStore(db, store, 'readwrite').delete(key)
    r.onsuccess = () => resolve()
    r.onerror   = () => reject(r.error)
  })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('wf-') && !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin
  if (url.origin !== self.location.origin) return

  // Immutable content-hashed Next.js chunks — cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // API routes
  if (url.pathname.startsWith('/api/')) {
    if (BYPASS_PREFIXES.some(p => url.pathname.startsWith(p))) return
    if (request.method === 'GET') {
      event.respondWith(apiNetworkFirst(request))
    } else {
      event.respondWith(handleMutation(request))
    }
    return
  }

  // Page navigations — network-first, stale HTML on failure
  if (request.mode === 'navigate') {
    event.respondWith(pageNetworkFirst(request))
    return
  }
})

// ─── Caching strategies ───────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    return new Response('', { status: 503 })
  }
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 5000)
    const res  = await fetch(request, { signal: ctrl.signal })
    clearTimeout(tid)
    if (res.ok) cache.put(request.url, res.clone())
    return res
  } catch {
    const stale = await cache.match(request.url)
    if (stale) return stale
    return new Response(OFFLINE_PAGE, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
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
      if (cached) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-WF-Offline': '1',
            'X-WF-Cached-At': new Date(cached.cachedAt).toISOString(),
          },
        })
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Queue non-GET mutations when offline; pass through when online
async function handleMutation(request) {
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 8000)
    const res  = await fetch(request.clone(), { signal: ctrl.signal })
    clearTimeout(tid)
    return res
  } catch {
    // Offline — persist the mutation
    try {
      const body    = await request.text()
      const headers = {}
      request.headers.forEach((v, k) => { headers[k] = v })
      const db = await openIDB()
      await idbAdd(db, 'mutations', {
        url: request.url,
        method: request.method,
        body,
        headers,
        queuedAt: Date.now(),
      })
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

  const done = []
  for (const m of all) {
    try {
      const res = await fetch(m.url, {
        method:  m.method,
        headers: m.headers,
        body:    m.body || undefined,
      })
      // 404/409 means the resource is gone or conflicted — remove from queue anyway
      if (res.ok || res.status === 404 || res.status === 409) {
        done.push(m.id)
      }
    } catch {
      break // still offline, stop and retry on next sync event
    }
  }

  for (const id of done) {
    await idbDelete(db, 'mutations', id).catch(() => {})
  }

  if (done.length > 0) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    for (const c of clients) {
      c.postMessage({ type: 'WF_SYNC_COMPLETE', synced: done.length })
    }
  }
}

// ─── Client messaging ─────────────────────────────────────────────────────────

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
})

// ─── Push Notifications ───────────────────────────────────────────────────────

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

// ─── Offline fallback page ────────────────────────────────────────────────────

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
    p{font-size:13px;color:#94a3b8;line-height:1.7;max-width:320px;margin:0 auto 24px}
    button{padding:11px 24px;background:#f59e0b;color:#080c1a;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer}
  </style>
</head>
<body>
  <div>
    <div class="icon">⚡</div>
    <h1>You're offline</h1>
    <p>Open a page you've already visited to keep working. Any changes you make will sync automatically when you reconnect.</p>
    <button onclick="history.back()">Go back</button>
  </div>
</body>
</html>`
