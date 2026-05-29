-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_tenantId_platform_accountId_key" ON "SocialConnection"("tenantId", "platform", "accountId");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
