import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// DDL requires the superuser connection (DATABASE_MIGRATION_URL).
// The restricted app user (DATABASE_URL) lacks CREATE TABLE / ALTER TABLE privileges.
function createMigrationClient() {
  const connString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString: connString })
  return new PrismaClient({ adapter })
}

async function createType(db: PrismaClient, name: string, values: string) {
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${name}" AS ENUM (${values});
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `)
}

async function addConstraint(db: PrismaClient, sql: string) {
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ${sql};
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `)
}

async function addColumn(db: PrismaClient, table: string, column: string, type: string) {
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `)
}

export async function runMigrations() {
  const db = createMigrationClient()
  try {
    await createType(db, 'Role', `'superadmin', 'admin', 'dispatcher', 'tech', 'readonly'`)
    await createType(db, 'JobStatus', `'open', 'scheduled', 'in_progress', 'done'`)
    await createType(db, 'Priority', `'low', 'normal', 'high', 'urgent'`)
    await createType(db, 'InvoiceStatus', `'draft', 'sent', 'paid', 'overdue'`)
    await createType(db, 'PaymentMethod', `'card', 'cash', 'check', 'digital'`)
    await createType(db, 'AuditSeverity', `'info', 'warn', 'error'`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'tech', "initials" TEXT NOT NULL, "company" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "name" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '📑',
    "units" INTEGER NOT NULL DEFAULT 1, "techInitials" TEXT NOT NULL DEFAULT '',
    "frequencyDays" INTEGER NOT NULL DEFAULT 90, "pricePerVisit" DOUBLE PRECISION NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL, "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "address" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL, "priority" "Priority" NOT NULL DEFAULT 'normal',
    "status" "JobStatus" NOT NULL DEFAULT 'open', "scheduledAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    "techId" TEXT, "contractId" TEXT, CONSTRAINT "Job_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL, "number" TEXT NOT NULL, "client" TEXT NOT NULL, "jobId" TEXT,
    "labor" DOUBLE PRECISION NOT NULL DEFAULT 0, "parts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft', "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL, "jobId" TEXT, "invoiceId" TEXT, "collectedById" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
    "cashTendered" DOUBLE PRECISION, "changeDue" DOUBLE PRECISION, "checkNumber" TEXT,
    "signature" TEXT, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Equipment" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "name" TEXT NOT NULL, "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL, "serialNumber" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '⚙',
    "installedAt" TIMESTAMP(3) NOT NULL, "warrantyEnd" TIMESTAMP(3),
    "intervalDays" INTEGER NOT NULL DEFAULT 90, "lastPMDaysAgo" INTEGER NOT NULL DEFAULT 0,
    "totalServices" INTEGER NOT NULL DEFAULT 0, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL, "jobId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Message_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "NotificationRule" (
    "id" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '🔔', "title" TEXT NOT NULL,
    "description" TEXT NOT NULL, "template" TEXT NOT NULL, "channel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL, "icon" TEXT NOT NULL, "action" TEXT NOT NULL, "detail" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info', "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))`)

    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_JobEquipment" (
    "A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_JobEquipment_AB_pkey" PRIMARY KEY ("A","B"))`)

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "_JobEquipment_B_index" ON "_JobEquipment"("B")`)

    await addConstraint(db, `ALTER TABLE "Job" ADD CONSTRAINT "Job_techId_fkey" FOREIGN KEY ("techId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Job" ADD CONSTRAINT "Job_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Payment" ADD CONSTRAINT "Payment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Message" ADD CONSTRAINT "Message_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "_JobEquipment" ADD CONSTRAINT "_JobEquipment_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
    await addConstraint(db, `ALTER TABLE "_JobEquipment" ADD CONSTRAINT "_JobEquipment_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE`)

    // --- Tenant table + tenantId columns ---
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"))`)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug")`)

    const tenantTables = ['User','Job','Invoice','Payment','Equipment','Contract','Message','AuditLog','NotificationRule']
    for (const t of tenantTables) {
      await addColumn(db, t, 'tenantId', 'TEXT')
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${t}_tenantId_idx" ON "${t}"("tenantId")`)
    }

    await addColumn(db, 'User', 'phone', 'TEXT')
    await addColumn(db, 'Job', 'archivedAt', 'TIMESTAMP(3)')

    // --- Auth columns ---
    await addColumn(db, 'User', 'emailVerified', 'BOOLEAN NOT NULL DEFAULT true')
    await addColumn(db, 'User', 'verifyToken', 'TEXT')
    await addColumn(db, 'User', 'resetToken', 'TEXT')
    await addColumn(db, 'User', 'resetTokenExpiry', 'TIMESTAMP(3)')
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_verifyToken_key" ON "User"("verifyToken") WHERE "verifyToken" IS NOT NULL`)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken") WHERE "resetToken" IS NOT NULL`)

    // --- Invite table ---
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Invite" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'tech',
    "token" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id"))`)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token")`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Invite_tenantId_idx" ON "Invite"("tenantId")`)
    await addConstraint(db, `ALTER TABLE "Invite" ADD CONSTRAINT "Invite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)

    // --- Backfill: create one Tenant per distinct non-superadmin company ---
    try {
      const companies = await db.$queryRaw<{ company: string }[]>`
        SELECT DISTINCT company FROM "User" WHERE company != '' AND company != 'WorkForge' AND "tenantId" IS NULL
      `
      for (const { company } of companies) {
        const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
        await db.$executeRawUnsafe(`
          INSERT INTO "Tenant" ("id","name","slug","updatedAt")
          SELECT gen_random_uuid(), $1, $2, NOW()
          WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE slug = $2)
        `, company, slug)
        await db.$executeRawUnsafe(`
          UPDATE "User" SET "tenantId" = (SELECT id FROM "Tenant" WHERE slug = $1 LIMIT 1)
          WHERE company = $2 AND role != 'superadmin' AND "tenantId" IS NULL
        `, slug, company)
      }

      await db.$executeRawUnsafe(`
        UPDATE "Job" j SET "tenantId" = u."tenantId"
        FROM "User" u WHERE j."techId" = u.id AND j."tenantId" IS NULL AND u."tenantId" IS NOT NULL
      `)
      await db.$executeRawUnsafe(`
        UPDATE "Job" SET "tenantId" = (SELECT id FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1)
        WHERE "tenantId" IS NULL AND EXISTS (SELECT 1 FROM "Tenant")
      `)
      for (const t of ['Invoice','Payment','Equipment','Contract','Message','NotificationRule']) {
        await db.$executeRawUnsafe(`
          UPDATE "${t}" SET "tenantId" = (SELECT id FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1)
          WHERE "tenantId" IS NULL AND EXISTS (SELECT 1 FROM "Tenant")
        `)
      }
      await db.$executeRawUnsafe(`
        UPDATE "AuditLog" al SET "tenantId" = u."tenantId"
        FROM "User" u WHERE al."userId" = u.id AND al."tenantId" IS NULL AND u."tenantId" IS NOT NULL
      `)
      await db.$executeRawUnsafe(`
        UPDATE "AuditLog" SET "tenantId" = (SELECT id FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1)
        WHERE "tenantId" IS NULL AND EXISTS (SELECT 1 FROM "Tenant")
      `)
    } catch (e) {
      console.warn('[migrations] Tenant backfill skipped (likely already done):', e)
    }

    // FK constraints for tenantId
    for (const t of tenantTables) {
      await addConstraint(db, `ALTER TABLE "${t}" ADD CONSTRAINT "${t}_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
    }
  } finally {
    await db.$disconnect()
  }
}
