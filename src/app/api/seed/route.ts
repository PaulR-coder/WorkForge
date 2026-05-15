import { prisma } from '@/lib/prisma'
import { seedDatabase } from '@/lib/seed'

async function runMigrations() {
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "Role" AS ENUM ('superadmin', 'admin', 'dispatcher', 'tech', 'readonly')`)
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "JobStatus" AS ENUM ('open', 'scheduled', 'in_progress', 'done')`)
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "Priority" AS ENUM ('low', 'normal', 'high', 'urgent')`)
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'overdue')`)
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "PaymentMethod" AS ENUM ('card', 'cash', 'check', 'digital')`)
  await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "AuditSeverity" AS ENUM ('info', 'warn', 'error')`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'tech', "initials" TEXT NOT NULL, "company" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "name" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '📑',
    "units" INTEGER NOT NULL DEFAULT 1, "techInitials" TEXT NOT NULL DEFAULT '',
    "frequencyDays" INTEGER NOT NULL DEFAULT 90, "pricePerVisit" DOUBLE PRECISION NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL, "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "address" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL, "priority" "Priority" NOT NULL DEFAULT 'normal',
    "status" "JobStatus" NOT NULL DEFAULT 'open', "scheduledAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    "techId" TEXT, "contractId" TEXT, CONSTRAINT "Job_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL, "number" TEXT NOT NULL, "client" TEXT NOT NULL, "jobId" TEXT,
    "labor" DOUBLE PRECISION NOT NULL DEFAULT 0, "parts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft', "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL, "jobId" TEXT, "invoiceId" TEXT, "collectedById" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
    "cashTendered" DOUBLE PRECISION, "changeDue" DOUBLE PRECISION, "checkNumber" TEXT,
    "signature" TEXT, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Equipment" (
    "id" TEXT NOT NULL, "client" TEXT NOT NULL, "name" TEXT NOT NULL, "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL, "serialNumber" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '⚙',
    "installedAt" TIMESTAMP(3) NOT NULL, "warrantyEnd" TIMESTAMP(3),
    "intervalDays" INTEGER NOT NULL DEFAULT 90, "lastPMDaysAgo" INTEGER NOT NULL DEFAULT 0,
    "totalServices" INTEGER NOT NULL DEFAULT 0, "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL, "jobId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Message_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "NotificationRule" (
    "id" TEXT NOT NULL, "icon" TEXT NOT NULL DEFAULT '🔔', "title" TEXT NOT NULL,
    "description" TEXT NOT NULL, "template" TEXT NOT NULL, "channel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL, "icon" TEXT NOT NULL, "action" TEXT NOT NULL, "detail" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info', "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))`)

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_JobEquipment" (
    "A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_JobEquipment_AB_pkey" PRIMARY KEY ("A","B"))`)

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "_JobEquipment_B_index" ON "_JobEquipment"("B")`)

  await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD CONSTRAINT IF NOT EXISTS "Job_techId_fkey" FOREIGN KEY ("techId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD CONSTRAINT IF NOT EXISTS "Job_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD CONSTRAINT IF NOT EXISTS "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD CONSTRAINT IF NOT EXISTS "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD CONSTRAINT IF NOT EXISTS "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD CONSTRAINT IF NOT EXISTS "Payment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Message" ADD CONSTRAINT IF NOT EXISTS "Message_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "Message" ADD CONSTRAINT IF NOT EXISTS "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD CONSTRAINT IF NOT EXISTS "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "_JobEquipment" ADD CONSTRAINT IF NOT EXISTS "_JobEquipment_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {})
  await prisma.$executeRawUnsafe(`ALTER TABLE "_JobEquipment" ADD CONSTRAINT IF NOT EXISTS "_JobEquipment_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {})
}

export async function GET() {
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}

export async function POST() {
  await runMigrations()
  await seedDatabase()
  return Response.json({ ok: true, message: 'Database migrated and seeded' })
}
