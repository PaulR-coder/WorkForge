-- Migration: nav-equipment-tracking
-- Adds sidebarPrefs to User, location fields + assignedJob relation to Equipment,
-- and the activeEquipment back-relation index on Equipment.

-- AlterTable: User — add sidebarPrefs
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sidebarPrefs" JSONB DEFAULT '{}';

-- AlterTable: Equipment — add location tracking fields
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "lat"           DOUBLE PRECISION;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "lng"           DOUBLE PRECISION;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "locatedAt"     TIMESTAMP(3);
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "assignedJobId" TEXT;

-- AddForeignKey: Equipment.assignedJobId → Job.id
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_assignedJobId_fkey";
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_assignedJobId_fkey"
  FOREIGN KEY ("assignedJobId") REFERENCES "Job"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Equipment(assignedJobId)
CREATE INDEX IF NOT EXISTS "Equipment_assignedJobId_idx" ON "Equipment"("assignedJobId");
