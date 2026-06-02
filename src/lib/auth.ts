import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { Role } from '@/generated/prisma/client'
import { getRedis } from './redis'

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is not set')
  return s
}
const COOKIE_NAME = 'wf_session'
const REAL_SESSION_COOKIE = 'wf_real_session'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  initials: string
  company: string
  tenantId: string | null
  impersonating?: boolean
}

type JwtPayload = SessionUser & { jti?: string; iat?: number; exp?: number }

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signToken(user: SessionUser): string {
  return jwt.sign({ ...user, jti: randomUUID() }, getJwtSecret(), { expiresIn: '24h' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null

  // Redis blocklist checks: per-token JTI block + per-user revocation timestamp
  const redis = getRedis()
  if (redis) {
    try {
      const checks: Promise<string | null>[] = [
        redis.get(`revoked:user:${payload.id}`),
      ]
      if (payload.jti) checks.push(redis.get(`blocked:jti:${payload.jti}`))
      const [revokedAt, blocked] = await Promise.all(checks)
      if (blocked) return null
      if (revokedAt && payload.iat && payload.iat < Number(revokedAt)) return null
    } catch { /* Redis down — degrade gracefully, session still valid */ }
  }

  const { jti: _j, iat: _i, exp: _e, ...session } = payload
  return session as SessionUser
}

export async function setSession(user: SessionUser) {
  const token = signToken(user)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
}

export async function clearSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    const payload = verifyToken(token)
    if (payload?.jti) {
      const redis = getRedis()
      if (redis) {
        const ttl = payload.exp
          ? Math.max(1, payload.exp - Math.floor(Date.now() / 1000))
          : 3600
        redis.setex(`blocked:jti:${payload.jti}`, ttl, '1').catch(() => {})
      }
    }
  }
  jar.delete(COOKIE_NAME)
  jar.delete(REAL_SESSION_COOKIE)
}

// Invalidate all active sessions for a user by setting a revocation timestamp.
// Any JWT issued before this moment will be rejected on the next request.
export async function revokeUserSessions(userId: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    // TTL of 48h covers the full JWT lifetime window
    await redis.setex(`revoked:user:${userId}`, 48 * 3600, Math.floor(Date.now() / 1000))
  }
}
