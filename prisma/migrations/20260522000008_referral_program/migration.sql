-- Migration: referral_program

CREATE TABLE IF NOT EXISTS "ReferralCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralUse" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "newTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ReferralUse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_tenantId_key" ON "ReferralCode"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_userId_key" ON "ReferralCode"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_code_key" ON "ReferralCode"("code");

ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_referralCodeId_fkey"
    FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
