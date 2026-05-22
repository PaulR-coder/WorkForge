-- AlterTable: add archivedAt and deletedAt columns to Job
-- archivedAt was in the schema but missing from migrations; add it idempotently.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
