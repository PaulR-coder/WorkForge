export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    try {
      const { runMigrations } = await import('./src/lib/migrations')
      const { seedDatabase } = await import('./src/lib/seed')
      await runMigrations()
      await seedDatabase()
      console.log('[startup] Database migrations complete')
    } catch (err) {
      console.error('[startup] Migration error (server will still start):', err)
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
