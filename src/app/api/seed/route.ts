import { runMigrations } from '@/lib/migrations'
import { seedDatabase } from '@/lib/seed'

export async function GET() {
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}

export async function POST() {
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}
