export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./lib/migrations')
    try {
      await runMigrations()
    } catch (e) {
      console.error('[startup] runMigrations failed — server will continue:', e)
    }
  }
}
