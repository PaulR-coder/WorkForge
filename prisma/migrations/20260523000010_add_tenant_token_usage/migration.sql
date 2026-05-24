CREATE TABLE "TenantTokenUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTokenUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantTokenUsage_tenantId_period_key" ON "TenantTokenUsage"("tenantId", "period");
CREATE INDEX "TenantTokenUsage_tenantId_idx" ON "TenantTokenUsage"("tenantId");
CREATE INDEX "TenantTokenUsage_period_idx" ON "TenantTokenUsage"("period");

ALTER TABLE "TenantTokenUsage" ADD CONSTRAINT "TenantTokenUsage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
