-- AddColumn serviceTypes to Tenant
ALTER TABLE "Tenant" ADD COLUMN "serviceTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable JobType
CREATE TABLE "JobType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex JobType_tenantId
CREATE INDEX "JobType_tenantId_idx" ON "JobType"("tenantId");

-- AddForeignKey JobType to Tenant
ALTER TABLE "JobType" ADD CONSTRAINT "JobType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
