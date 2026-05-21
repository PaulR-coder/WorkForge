export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./lib/migrations')
    const { seedDatabase } = await import('./lib/seed')
    try {
      await runMigrations()
    } catch (e) {
      console.error('[startup] runMigrations failed — server will continue:', e)
    }
    try {
      await seedDatabase()
    } catch (e) {
      console.error('[startup] seedDatabase failed — server will continue:', e)
    }
  }
}
