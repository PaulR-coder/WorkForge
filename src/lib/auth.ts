import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { Role } from '@/generated/prisma/client'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set')
const JWT_SECRET = jwtSecret
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

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
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
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
