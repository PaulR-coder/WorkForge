-- Migration: sessions_lockout_feedback
-- Add account lockout fields and session version to User

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Create FeatureRequest table

CREATE TABLE IF NOT EXISTS "FeatureRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- Create FeatureVote table

CREATE TABLE IF NOT EXISTS "FeatureVote" (
    "id" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureVote_pkey" PRIMARY KEY ("id")
);

-- Add indexes

CREATE INDEX IF NOT EXISTS "FeatureRequest_tenantId_idx" ON "FeatureRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "FeatureRequest_userId_idx" ON "FeatureRequest"("userId");
CREATE INDEX IF NOT EXISTS "FeatureVote_featureRequestId_idx" ON "FeatureVote"("featureRequestId");
CREATE INDEX IF NOT EXISTS "FeatureVote_userId_idx" ON "FeatureVote"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureVote_featureRequestId_userId_key" ON "FeatureVote"("featureRequestId", "userId");

-- Add foreign key constraints

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FeatureRequest_userId_fkey'
  ) THEN
    ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FeatureRequest_tenantId_fkey'
  ) THEN
    ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FeatureVote_featureRequestId_fkey'
  ) THEN
    ALTER TABLE "FeatureVote" ADD CONSTRAINT "FeatureVote_featureRequestId_fkey"
      FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FeatureVote_userId_fkey'
  ) THEN
    ALTER TABLE "FeatureVote" ADD CONSTRAINT "FeatureVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
