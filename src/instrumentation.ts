export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { runMigrations } = await import('./lib/migrations')
      await runMigrations()
    } catch (e) {
      console.error('[startup] runMigrations failed — server will continue:', e)
    }
    try {
      const { seedDatabase } = await import('./lib/seed')
      await seedDatabase()
    } catch (e) {
      console.error('[startup] seedDatabase failed — server will continue:', e)
    }
  }
}
