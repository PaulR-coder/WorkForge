/*
  Warnings:

  - The primary key for the `JobType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[tenantId,name]` on the table `JobType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `JobType` table without a default value. This is not possible if the table has rows.

*/
-- DropIndex
DROP INDEX "JobType_tenantId_idx";

-- AlterTable
ALTER TABLE "JobType" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "JobType_tenantId_name_key" ON "JobType"("tenantId", "name");
