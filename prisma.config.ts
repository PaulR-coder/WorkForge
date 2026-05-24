import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations use DATABASE_MIGRATION_URL (superuser) if set; runtime uses DATABASE_URL (restricted user).
// This ensures RLS is enforced for all app queries while migrations still have DDL privileges.
function buildMigrationUrl(): string {
  const base = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL ?? ''
  const separator = base.includes('?') ? '&' : '?'
  const limit = process.env.DB_CONNECTION_LIMIT ?? '10'
  return `${base}${separator}connection_limit=${limit}&pool_timeout=20`
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildMigrationUrl(),
  },
});
