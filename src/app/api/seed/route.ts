import { runMigrations } from '@/lib/migrations'
import { seedDatabase } from '@/lib/seed'

const SEED_SECRET = process.env.SEED_SECRET

function blocked() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return blocked()
  const { searchParams } = new URL(req.url)
  if (SEED_SECRET && searchParams.get('secret') !== SEED_SECRET) return blocked()
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') return blocked()
  let secret: string | undefined
  try { secret = (await req.json()).secret } catch { /* no body */ }
  if (SEED_SECRET && secret !== SEED_SECRET) return blocked()
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}
