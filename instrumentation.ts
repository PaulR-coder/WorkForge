export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    const { runMigrations } = await import('./src/lib/migrations')
    const { seedDatabase } = await import('./src/lib/seed')
    await runMigrations()
    await seedDatabase()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
