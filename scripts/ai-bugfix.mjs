/**
 * WorkForge AI Bug Fix Agent
 *
 * Two modes:
 *  1. REACTIVE  — Sentry has unresolved errors → Claude Opus investigates and fixes them
 *  2. PROACTIVE — No Sentry errors → Claude Opus scans codebase for latent bugs / security issues
 *
 * Confidence gates:
 *  >= 85 + fix files provided → GitHub PR (auto-deploy on merge)
 *  >= 50                      → GitHub issue for human review
 *  < 50                       → silently skipped
 *
 * Required env: ANTHROPIC_API_KEY, SENTRY_AUTH_TOKEN, SENTRY_DSN, GITHUB_TOKEN, REPO
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const REPO                 = process.env.REPO   // e.g. "owner/workforge"
const CONFIDENCE_PR        = 85
const CONFIDENCE_ISSUE_MIN = 50
const CONFIDENCE_SCAN_PR   = 85   // higher bar for proactive fixes — no repro available
const MAX_REACTIVE_ISSUES  = 3
const MAX_SCAN_FINDINGS    = 4    // cap findings per run to avoid issue spam
const MAX_AGENT_TURNS      = 25
const MAX_SCAN_TURNS       = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Sentry helpers ───────────────────────────────────────────────────────────

function parseDsn(dsn) {
  const match = dsn.match(/https:\/\/[^@]+@o(\d+)\.ingest[^/]+\/(\d+)/)
  if (!match) throw new Error(`Cannot parse DSN: ${dsn}`)
  return { orgId: match[1], projectId: match[2] }
}

async function sentryGet(path) {
  const res = await fetch(`https://sentry.io/api/0${path}`, {
    headers: { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sentry ${res.status} ${path}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function sentryPatch(issueId, data) {
  try {
    const res = await fetch(`https://sentry.io/api/0/issues/${issueId}/`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

async function discoverSentrySlugs(orgId, projectId) {
  const orgs = await sentryGet('/organizations/')
  const org = orgs.find(o => o.id === orgId) ?? orgs[0]
  if (!org) throw new Error('No Sentry organizations accessible with this token')

  const projects = await sentryGet(`/organizations/${org.slug}/projects/`)
  const project = projects.find(p => p.id === projectId) ?? projects[0]
  if (!project) throw new Error('No matching Sentry project found')

  return { orgSlug: org.slug, projectSlug: project.slug }
}

async function fetchIssues(orgSlug, projectSlug) {
  return sentryGet(
    `/projects/${orgSlug}/${projectSlug}/issues/?query=is:unresolved&limit=${MAX_REACTIVE_ISSUES}&sort=date`,
  )
}

async function fetchLatestEvent(issueId) {
  return sentryGet(`/issues/${issueId}/events/latest/`)
}

function formatStackTrace(event) {
  const exception = event.entries?.find(e => e.type === 'exception')
  const frames = exception?.data?.values?.[0]?.stacktrace?.frames ?? []
  const appFrames = frames.filter(f => f.inApp || f.filename?.includes('src/'))
  if (!appFrames.length) return '(no app-level stack frames available)'
  return appFrames
    .map(f => {
      const ctx = f.context?.map(([, line]) => `    ${line}`).join('\n') ?? ''
      return `  ${f.filename}:${f.lineNo} in ${f.function ?? 'anonymous'}\n${ctx}`
    })
    .join('\n')
}

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function githubRequest(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization:        `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type':       'application/json',
      Accept:               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub ${method} ${path} → ${res.status}: ${err.slice(0, 300)}`)
  }
  return res.json()
}

async function getMainSha() {
  const ref = await githubRequest('GET', `/repos/${REPO}/git/ref/heads/main`)
  return ref.object.sha
}

async function getOpenAIPRs() {
  const prs = await githubRequest('GET', `/repos/${REPO}/pulls?state=open&per_page=100`)
  return prs.filter(pr => pr.title.startsWith('🤖') || pr.title.startsWith('🔍'))
}

async function getOpenAIScanIssues() {
  try {
    const issues = await githubRequest('GET', `/repos/${REPO}/issues?state=open&per_page=100`)
    return issues.filter(i => i.title.startsWith('🔍 [AI Scan]'))
  } catch {
    return []
  }
}

async function ensureLabels() {
  const labels = [
    { name: 'ai-generated', color: '7057ff', description: 'Created by AI reactive bug-fix agent' },
    { name: 'ai-scan',      color: '0075ca', description: 'Found by AI proactive code scanner'   },
    { name: 'bug',          color: 'd73a4a', description: 'Something is not working'              },
    { name: 'needs-review', color: 'e4e669', description: 'Requires human review before merge'   },
    { name: 'security',     color: 'e11d48', description: 'Security-related finding'              },
  ]
  for (const label of labels) {
    try { await githubRequest('POST', `/repos/${REPO}/labels`, label) } catch { /* exists */ }
  }
}

async function createBranch(branchName, sha) {
  await githubRequest('POST', `/repos/${REPO}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha,
  })
}

async function upsertFile(filePath, content, branch, commitMessage) {
  const encoded = Buffer.from(content).toString('base64')
  let existingSha
  try {
    const existing = await githubRequest('GET', `/repos/${REPO}/contents/${filePath}?ref=${branch}`)
    existingSha = existing.sha
  } catch { existingSha = undefined }

  await githubRequest('PUT', `/repos/${REPO}/contents/${filePath}`, {
    message: commitMessage,
    content: encoded,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  })
}

async function createReactivePR(sentryIssue, fix, branchName) {
  const pr = await githubRequest('POST', `/repos/${REPO}/pulls`, {
    title: `🤖 [AI Fix] ${fix.fix_description}`,
    body: `## AI-Generated Bug Fix

**Sentry Issue:** [${sentryIssue.title}](${sentryIssue.permalink ?? '#'})
**Sentry ID:** \`${sentryIssue.id}\`
**Confidence:** ${fix.confidence}/100
**Files changed:** ${fix.files.map(f => `\`${f.path}\``).join(', ')}

## Root Cause
${fix.reasoning}

## Files Modified
${fix.files.map(f => `- \`${f.path}\``).join('\n')}

---
> Generated by WorkForge AI Bug Fix Agent (Claude Opus). Review carefully before merging.`,
    head: branchName,
    base: 'main',
  })
  try {
    await githubRequest('POST', `/repos/${REPO}/issues/${pr.number}/labels`, {
      labels: ['ai-generated', 'bug'],
    })
  } catch { /* labels may not exist */ }
  return pr
}

async function createReactiveIssue(sentryIssue, title, analysis, confidence) {
  const issue = await githubRequest('POST', `/repos/${REPO}/issues`, {
    title: `🤖 [AI Analysis] ${title}`,
    body: `## AI Bug Analysis

**Sentry Issue:** [${sentryIssue.title}](${sentryIssue.permalink ?? '#'})
**Sentry ID:** \`${sentryIssue.id}\`
**AI Confidence:** ${confidence}/100 *(below ${CONFIDENCE_PR} PR threshold — flagged for human review)*

## Analysis
${analysis}

---
> Flagged by WorkForge AI Bug Fix Agent (Claude Opus). Manual fix required.`,
    labels: ['ai-generated', 'needs-review'],
  })
  return issue
}

async function createScanPR(finding, branchName) {
  const severityBadge = { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium' }[finding.severity] ?? '⚪ Unknown'
  const pr = await githubRequest('POST', `/repos/${REPO}/pulls`, {
    title: `🔍 [AI Scan] ${finding.title}`,
    body: `## Proactive AI Code Review Fix

**Severity:** ${severityBadge}
**File:** \`${finding.file}\`
**Confidence:** ${finding.confidence}/100

## Issue Found
${finding.description}

## Files Modified
${(finding.fix_files ?? []).map(f => `- \`${f.path}\``).join('\n')}

---
> Found by WorkForge Proactive AI Scanner (Claude Opus). No Sentry error triggered this — preventive fix.`,
    head: branchName,
    base: 'main',
  })
  try {
    await githubRequest('POST', `/repos/${REPO}/issues/${pr.number}/labels`, {
      labels: ['ai-scan', finding.severity === 'critical' ? 'security' : 'bug'],
    })
  } catch { /* labels may not exist */ }
  return pr
}

async function createScanIssue(finding) {
  const severityEmoji = { critical: '🔴', high: '🟠', medium: '🟡' }[finding.severity] ?? '⚪'
  const issue = await githubRequest('POST', `/repos/${REPO}/issues`, {
    title: `🔍 [AI Scan] ${finding.title}`,
    body: `## Proactive Code Review Finding

${severityEmoji} **Severity:** ${finding.severity.toUpperCase()}
**File:** \`${finding.file}\`
**Confidence:** ${finding.confidence}/100

## Issue
${finding.description}

---
> Found by WorkForge Proactive AI Scanner (Claude Opus). No active Sentry error — preventive review.`,
    labels: ['ai-scan', finding.severity === 'critical' ? 'security' : 'needs-review'],
  })
  return issue
}

// ─── File system tools ────────────────────────────────────────────────────────

const CWD = process.cwd()

function safePath(p) {
  const resolved = path.resolve(CWD, p)
  if (!resolved.startsWith(CWD)) throw new Error(`Path traversal blocked: ${p}`)
  return resolved
}

function toolReadFile(p) {
  try {
    const content = fs.readFileSync(safePath(p), 'utf8')
    // Add line numbers for precise reference
    return content.split('\n').map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`).join('\n')
  } catch (e) {
    return `Error: ${e.message}`
  }
}

function toolListDir(p) {
  try {
    return fs
      .readdirSync(safePath(p), { withFileTypes: true })
      .map(e => `${e.isDirectory() ? '[dir] ' : '[file]'} ${e.name}`)
      .join('\n')
  } catch (e) {
    return `Error: ${e.message}`
  }
}

function toolSearchCode(query) {
  try {
    return (
      execSync(
        `grep -r --include="*.ts" --include="*.tsx" -l ${JSON.stringify(query)} src/ 2>/dev/null | head -20`,
        { encoding: 'utf8', cwd: CWD },
      ) || 'No matches'
    )
  } catch {
    return 'No matches'
  }
}

function toolGrepContent(query, beforeLines = 2, afterLines = 3) {
  try {
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" -B ${beforeLines} -A ${afterLines} ${JSON.stringify(query)} src/ 2>/dev/null | head -200`,
      { encoding: 'utf8', cwd: CWD },
    )
    return result || 'No matches'
  } catch {
    return 'No matches'
  }
}

// ─── Shared tool definitions ──────────────────────────────────────────────────

const BASE_TOOLS = [
  {
    name: 'read_file',
    description: 'Read a source file from the repository. Lines are prefixed with line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from repo root, e.g. src/app/api/jobs/route.ts' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and subdirectories at a path.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative directory path, e.g. src/app/api' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for a string across all TypeScript files — returns matching file paths.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'grep_content',
    description: 'Grep for a string across all TypeScript files — returns matching lines WITH surrounding context and line numbers. Use this when you need to see the actual code around a match.',
    input_schema: {
      type: 'object',
      properties: {
        query:        { type: 'string', description: 'The search string' },
        before_lines: { type: 'number', description: 'Lines of context before match (default 2)' },
        after_lines:  { type: 'number', description: 'Lines of context after match (default 3)' },
      },
      required: ['query'],
    },
  },
]

const REACTIVE_TOOLS = [
  ...BASE_TOOLS,
  {
    name: 'submit_fix',
    description:
      'Submit a code fix. Call this once you have identified the bug and written corrected code. ' +
      'Use confidence >= 85 only when certain the fix is correct and complete.',
    input_schema: {
      type: 'object',
      properties: {
        confidence: {
          type: 'number',
          description: '0–100. 85+ → PR created. 50–84 → GitHub issue. <50 → skipped.',
        },
        fix_description: {
          type: 'string',
          description: 'One-line PR/commit title, e.g. "fix: handle null techId in job assignment"',
        },
        reasoning: {
          type: 'string',
          description: 'Full explanation: root cause, why this fix resolves it, any edge cases considered.',
        },
        files: {
          type: 'array',
          description: 'Files to create or overwrite. Provide COMPLETE file content — not diffs or snippets.',
          items: {
            type: 'object',
            properties: {
              path:    { type: 'string', description: 'Relative path from repo root' },
              content: { type: 'string', description: 'Complete new file content' },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['confidence', 'fix_description', 'reasoning', 'files'],
    },
  },
  {
    name: 'flag_unfixable',
    description:
      'Call when you cannot identify a confident fix — e.g. the error is in a third-party library, ' +
      'requires environment changes, is intentional behavior, or needs more context.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why you cannot fix this automatically' },
      },
      required: ['reason'],
    },
  },
]

const SCAN_TOOLS = [
  ...BASE_TOOLS,
  {
    name: 'report_finding',
    description:
      'Report a real bug or security issue found during proactive scanning. ' +
      'Only call this for confirmed, concrete issues — not theoretical or style concerns.',
    input_schema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium'],
          description: 'critical = exploitable or data-loss risk; high = definite bug; medium = probable bug',
        },
        title: {
          type: 'string',
          description: 'Short title for the GitHub issue/PR, e.g. "Missing tenant isolation in contracts API"',
        },
        file: {
          type: 'string',
          description: 'Primary file containing the issue, e.g. src/app/api/contracts/route.ts',
        },
        description: {
          type: 'string',
          description:
            'Full explanation: what is wrong, exact file + line reference, what could go wrong in production, and how to fix it.',
        },
        fix_files: {
          type: 'array',
          description:
            `Optional but preferred. If you can provide a complete, confident fix, include the full corrected file content. ` +
            `Confidence must be >= ${CONFIDENCE_SCAN_PR} to auto-create a PR.`,
          items: {
            type: 'object',
            properties: {
              path:    { type: 'string' },
              content: { type: 'string', description: 'COMPLETE corrected file content' },
            },
            required: ['path', 'content'],
          },
        },
        confidence: {
          type: 'number',
          description: '0–100. How certain are you this is a real issue in this codebase?',
        },
      },
      required: ['severity', 'title', 'file', 'description', 'confidence'],
    },
  },
  {
    name: 'scan_complete',
    description: 'Call when you have finished scanning and have no more findings to report.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'One sentence: what areas you scanned and what you found (or did not find).',
        },
      },
      required: ['summary'],
    },
  },
]

// ─── System prompts ───────────────────────────────────────────────────────────

const REACTIVE_SYSTEM = `You are an autonomous bug-fixing agent for WorkForge, a multi-tenant field operations SaaS.

Stack: Next.js 16 App Router, Prisma v7 + PostgreSQL, Railway deployment, TypeScript throughout.

Key source layout:
- src/app/api/          — API route handlers (GET/POST/PATCH/DELETE per resource)
- src/app/(app)/        — authenticated UI pages and client components
- src/lib/              — shared utilities: auth.ts, prisma.ts, permissions.ts, email.ts, rateLimit.ts, migrations.ts, seed.ts, tenant.ts
- src/generated/prisma/ — generated Prisma client (DO NOT EDIT)
- prisma/schema.prisma  — DB schema (DO NOT EDIT)

Auth pattern:
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

Tenant pattern:
  const tenantFilter = getTenantFilter(session)
  prisma.resource.findMany({ where: { ...tenantFilter, ...otherFilters } })

Permission pattern:
  if (!can(session.role, 'editJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })

Your process:
1. Read the stack trace carefully to find the exact file and line number
2. Read that file (and related files if needed) using read_file — note the line numbers
3. Use grep_content to find related patterns if needed
4. Identify the root cause with certainty
5. Write a complete corrected file
6. Call submit_fix with your confidence score

Hard rules:
- NEVER modify: prisma/schema.prisma, src/lib/migrations.ts, src/generated/*, package.json, *.toml, *.env*
- Always read a file before deciding to change it
- submit_fix requires COMPLETE file content — not snippets or diffs
- Only change the minimum number of files necessary
- If you cannot identify the bug with certainty, call flag_unfixable`

const SCAN_SYSTEM = `You are a proactive security and correctness reviewer for WorkForge, a multi-tenant field operations SaaS (Next.js 16, Prisma v7, PostgreSQL, Railway, TypeScript).

No active Sentry errors exist right now. Your mission: find real bugs and security vulnerabilities in the codebase before they cause production problems.

Key patterns this codebase must follow in every API route:

1. AUTHENTICATION — every non-public route must start with:
   const session = await getSession()
   if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

2. TENANT ISOLATION — every route touching DB data must use:
   const tenantFilter = getTenantFilter(session)
   ...where: { ...tenantFilter, ...otherFilters }
   OR explicitly check tenantId in the where clause

3. PERMISSION CHECKS — write operations (POST/PATCH/DELETE) must check:
   if (!can(session.role, 'permissionName')) return Response.json({ error: 'Forbidden' }, { status: 403 })

4. INPUT VALIDATION — never trust req.json() blindly; check for required fields before using them

5. ERROR HANDLING — async DB calls should handle errors gracefully

Source layout:
- src/app/api/          — API routes (your primary focus)
- src/lib/auth.ts       — getSession(), setSession(), verifyPassword()
- src/lib/permissions.ts— can(role, permission) helper
- src/lib/tenant.ts     — getTenantFilter(session), requireTenantId(session)
- src/generated/prisma/ — DO NOT suggest editing these

Instructions:
1. Start by listing src/app/api/ to see all routes
2. Read each route file methodically
3. For each issue found, call report_finding with the exact file path and line number
4. After checking all routes, also scan src/lib/ for utility bugs
5. When done scanning, call scan_complete

Only report CONFIRMED issues you actually saw in the code — not theoretical ones. Cite line numbers.`

// ─── Reactive agent loop ──────────────────────────────────────────────────────

async function runReactiveAgent(issue, event) {
  const stackTrace = formatStackTrace(event)
  const errorContext = [
    `Error: ${issue.title}`,
    `Culprit: ${issue.culprit ?? 'unknown'}`,
    `First seen: ${issue.firstSeen}`,
    `Last seen: ${issue.lastSeen}`,
    `Occurrences: ${issue.count}`,
    ``,
    `Stack trace:`,
    stackTrace,
    event.message ? `\nMessage: ${event.message}` : '',
    event.contexts?.runtime ? `\nRuntime: ${JSON.stringify(event.contexts.runtime)}` : '',
  ].filter(Boolean).join('\n')

  const messages = [
    {
      role: 'user',
      content: `A Sentry error was detected in production. Investigate and fix it.\n\n${errorContext}`,
    },
  ]

  let fixResult  = null
  let flagResult = null

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 8000,
      system:     REACTIVE_SYSTEM,
      tools:      REACTIVE_TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      console.log('  Agent finished without a tool decision')
      break
    }

    const toolUses = response.content.filter(b => b.type === 'tool_use')
    if (!toolUses.length) break

    const toolResults = []
    let done = false

    for (const use of toolUses) {
      let result

      if (use.name === 'read_file') {
        result = toolReadFile(use.input.path)
        console.log(`  read_file      ${use.input.path}`)
      } else if (use.name === 'list_directory') {
        result = toolListDir(use.input.path)
        console.log(`  list_dir       ${use.input.path}`)
      } else if (use.name === 'search_code') {
        result = toolSearchCode(use.input.query)
        console.log(`  search         "${use.input.query}"`)
      } else if (use.name === 'grep_content') {
        result = toolGrepContent(use.input.query, use.input.before_lines, use.input.after_lines)
        console.log(`  grep_content   "${use.input.query}"`)
      } else if (use.name === 'submit_fix') {
        fixResult = use.input
        result    = 'Fix received.'
        console.log(`  submit_fix     confidence=${use.input.confidence} — ${use.input.fix_description}`)
        done = true
      } else if (use.name === 'flag_unfixable') {
        flagResult = use.input
        result     = 'Noted.'
        console.log(`  flag_unfixable — ${use.input.reason}`)
        done = true
      }

      toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: result })
      if (done) break
    }

    messages.push({ role: 'user', content: toolResults })
    if (done) break
  }

  return { fixResult, flagResult }
}

// ─── Proactive scan loop ──────────────────────────────────────────────────────

async function runProactiveScan(openScanIssues) {
  const existingTitles = openScanIssues.map(i => i.title.toLowerCase())

  const alreadyReported = existingTitles.length
    ? `Already-open AI scan issues (do NOT duplicate these):\n${openScanIssues.map(i => `  - ${i.title}`).join('\n')}`
    : 'No existing AI scan issues open yet.'

  const messages = [
    {
      role: 'user',
      content: `Begin proactive security and correctness scan of the WorkForge codebase.\n\n${alreadyReported}\n\nStart by listing src/app/api/ then read each route file.`,
    },
  ]

  const findings    = []
  let scanComplete  = false

  for (let turn = 0; turn < MAX_SCAN_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 8000,
      system:     SCAN_SYSTEM,
      tools:      SCAN_TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') break

    const toolUses = response.content.filter(b => b.type === 'tool_use')
    if (!toolUses.length) break

    const toolResults = []

    for (const use of toolUses) {
      let result

      if (use.name === 'read_file') {
        result = toolReadFile(use.input.path)
        console.log(`  read_file      ${use.input.path}`)
      } else if (use.name === 'list_directory') {
        result = toolListDir(use.input.path)
        console.log(`  list_dir       ${use.input.path}`)
      } else if (use.name === 'search_code') {
        result = toolSearchCode(use.input.query)
        console.log(`  search         "${use.input.query}"`)
      } else if (use.name === 'grep_content') {
        result = toolGrepContent(use.input.query, use.input.before_lines, use.input.after_lines)
        console.log(`  grep_content   "${use.input.query}"`)
      } else if (use.name === 'report_finding') {
        const f = use.input
        // Deduplicate: skip if a very similar issue already exists
        const isDup = openScanIssues.some(existing =>
          existing.body?.includes(f.file) &&
          existingTitles.some(t => t.includes(f.title.toLowerCase().slice(0, 25)))
        )
        if (isDup) {
          result = 'Duplicate — this issue is already tracked. Continue scanning.'
          console.log(`  report_finding DUPLICATE — ${f.title}`)
        } else {
          findings.push(f)
          result = findings.length >= MAX_SCAN_FINDINGS
            ? `Finding recorded (${findings.length}/${MAX_SCAN_FINDINGS}). Max reached — call scan_complete now.`
            : `Finding recorded (${findings.length}/${MAX_SCAN_FINDINGS}). Continue scanning.`
          console.log(`  report_finding [${f.severity}] ${f.title} (confidence: ${f.confidence})`)
        }
      } else if (use.name === 'scan_complete') {
        scanComplete = true
        result       = 'Scan complete.'
        console.log(`  scan_complete  ${use.input.summary}`)
      }

      toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
    if (scanComplete || findings.length >= MAX_SCAN_FINDINGS) break
  }

  return findings
}

// ─── Process a reactive Sentry issue ─────────────────────────────────────────

async function processReactiveIssue(issue, openAIPRs) {
  console.log(`\n── [Reactive] Issue [${issue.id}] ${issue.title}`)

  // Skip if we already have an open AI PR for this issue
  if (openAIPRs.some(pr => pr.body?.includes(issue.id) || pr.body?.includes(issue.title))) {
    console.log('  Skipping — open AI PR already exists')
    return
  }

  let event
  try {
    event = await fetchLatestEvent(issue.id)
  } catch (e) {
    console.log(`  Cannot fetch event: ${e.message}`)
    return
  }

  const { fixResult, flagResult } = await runReactiveAgent(issue, event)

  if (!fixResult && !flagResult) {
    console.log('  No decision — skipping')
    return
  }

  if (fixResult) {
    const { confidence, fix_description, reasoning, files } = fixResult

    if (confidence >= CONFIDENCE_PR) {
      const branch  = `ai-fix/sentry-${issue.id}-${Date.now()}`
      const baseSha = await getMainSha()
      await createBranch(branch, baseSha)

      for (const file of files) {
        await upsertFile(file.path, file.content, branch, `fix: ${fix_description}`)
        console.log(`  committed      ${file.path}`)
      }

      const pr = await createReactivePR(issue, fixResult, branch)
      console.log(`  ✅ PR #${pr.number}: ${pr.html_url}`)

      // Tag the Sentry issue so it doesn't get picked up next run
      await sentryPatch(issue.id, { assignedTo: 'me' })

    } else if (confidence >= CONFIDENCE_ISSUE_MIN) {
      const gh = await createReactiveIssue(issue, fix_description, reasoning, confidence)
      console.log(`  ⚠️  Issue #${gh.number}: ${gh.html_url}`)
    } else {
      console.log(`  Confidence ${confidence} < ${CONFIDENCE_ISSUE_MIN} — skipping`)
    }
  } else if (flagResult) {
    const gh = await createReactiveIssue(
      issue,
      issue.title,
      `Claude could not auto-fix this issue.\n\n**Reason:** ${flagResult.reason}`,
      0,
    )
    console.log(`  ⚠️  Issue #${gh.number}: ${gh.html_url}`)
  }
}

// ─── Process a proactive scan finding ────────────────────────────────────────

async function processScanFinding(finding, openAIPRs) {
  console.log(`\n── [Scan] [${finding.severity}] ${finding.title}`)

  if (finding.confidence < CONFIDENCE_ISSUE_MIN) {
    console.log(`  Confidence ${finding.confidence} < ${CONFIDENCE_ISSUE_MIN} — skipping`)
    return
  }

  const canAutoFix = Array.isArray(finding.fix_files) &&
                     finding.fix_files.length > 0 &&
                     finding.confidence >= CONFIDENCE_SCAN_PR

  // Skip if there's already an open AI PR touching the same file
  if (canAutoFix && openAIPRs.some(pr => pr.body?.includes(finding.file))) {
    console.log('  Skipping — open AI PR already touches this file')
    return
  }

  if (canAutoFix) {
    const branch  = `ai-scan/${path.basename(finding.file, '.ts').replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`
    const baseSha = await getMainSha()
    await createBranch(branch, baseSha)

    for (const file of finding.fix_files) {
      await upsertFile(file.path, file.content, branch, `fix: ${finding.title}`)
      console.log(`  committed      ${file.path}`)
    }

    const pr = await createScanPR(finding, branch)
    console.log(`  ✅ PR #${pr.number}: ${pr.html_url}`)
  } else {
    const gh = await createScanIssue(finding)
    console.log(`  ⚠️  Issue #${gh.number}: ${gh.html_url}`)
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log('WorkForge AI Agent — starting')
  console.log(`Mode will be determined by Sentry queue depth\n`)

  const required = ['ANTHROPIC_API_KEY', 'SENTRY_AUTH_TOKEN', 'SENTRY_DSN', 'GITHUB_TOKEN', 'REPO']
  const missing  = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  // Bootstrap GitHub labels
  try { await ensureLabels() } catch { /* best-effort */ }

  // Discover Sentry org + project slugs
  const { orgId, projectId } = parseDsn(process.env.SENTRY_DSN)
  console.log(`Sentry org ID: ${orgId}, project ID: ${projectId}`)

  let orgSlug, projectSlug
  try {
    ;({ orgSlug, projectSlug } = await discoverSentrySlugs(orgId, projectId))
    console.log(`Sentry project: ${orgSlug}/${projectSlug}`)
  } catch (e) {
    console.error(`Sentry discovery failed: ${e.message}`)
    process.exit(1)
  }

  const issues = await fetchIssues(orgSlug, projectSlug)

  if (issues.length > 0) {
    // ── REACTIVE MODE ──────────────────────────────────────────────────────
    console.log(`\n🔴 REACTIVE MODE — ${issues.length} unresolved Sentry issue(s)`)
    const openAIPRs = await getOpenAIPRs()
    console.log(`Open AI PRs: ${openAIPRs.length}`)

    for (const issue of issues.slice(0, MAX_REACTIVE_ISSUES)) {
      try {
        await processReactiveIssue(issue, openAIPRs)
      } catch (e) {
        console.error(`Error on issue ${issue.id}: ${e.message}`)
      }
    }
  } else {
    // ── PROACTIVE MODE ─────────────────────────────────────────────────────
    console.log('\n🟢 PROACTIVE MODE — Sentry queue is clean, scanning codebase for latent issues')
    const openAIPRs       = await getOpenAIPRs()
    const openScanIssues  = await getOpenAIScanIssues()
    console.log(`Open AI PRs: ${openAIPRs.length} | Open scan issues: ${openScanIssues.length}`)

    let findings
    try {
      findings = await runProactiveScan(openScanIssues)
    } catch (e) {
      console.error(`Proactive scan failed: ${e.message}`)
      process.exit(1)
    }

    if (!findings.length) {
      console.log('\n✅ Proactive scan complete — no issues found.')
    } else {
      console.log(`\nFound ${findings.length} issue(s) to report`)
      for (const finding of findings) {
        try {
          await processScanFinding(finding, openAIPRs)
        } catch (e) {
          console.error(`Error on finding "${finding.title}": ${e.message}`)
        }
      }
    }
  }

  console.log('\nAgent run complete.')
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
