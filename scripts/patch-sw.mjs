/**
 * Runs after `next build`. Reads the Next.js build ID from .next/BUILD_ID
 * and stamps it into public/sw.js so every deploy gets its own cache namespace.
 * Uses a regex so it works whether the file has the placeholder or a previous ID.
 * Old caches are evicted automatically when the SW activates with the new version.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const buildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
const swPath  = join(process.cwd(), 'public', 'sw.js')
const src     = readFileSync(swPath, 'utf-8')

// Matches both the placeholder and any previously stamped wf-* version
const patched = src.replace(/const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = 'wf-${buildId}'`)

if (patched === src) {
  console.error('[patch-sw] ERROR: could not find CACHE_VERSION line in public/sw.js')
  process.exit(1)
}

writeFileSync(swPath, patched)
console.log(`[patch-sw] CACHE_VERSION → wf-${buildId}`)
