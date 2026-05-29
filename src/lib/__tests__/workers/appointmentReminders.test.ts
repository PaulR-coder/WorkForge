import { runAppointmentReminders } from '@/lib/workers/appointmentReminders'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: { findMany: jest.fn() },
    auditLog: { createMany: jest.fn().mockResolvedValue({}) },
  },
}))

jest.mock('@/lib/email', () => ({
  emailAppointmentReminder: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/sms', () => ({
  smsAppointmentReminder: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { emailAppointmentReminder } from '@/lib/email'

describe('runAppointmentReminders', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns zero processed when no jobs scheduled tomorrow', async () => {
    ;(prisma.job.findMany as jest.Mock).mockResolvedValue([])
    const result = await runAppointmentReminders()
    expect(result.processed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('sends email reminder when job has clientEmail', async () => {
    ;(prisma.job.findMany as jest.Mock).mockResolvedValue([{
      id: 'job-1',
      client: 'Acme Corp',
      clientEmail: 'client@example.com',
      clientPhone: null,
      address: '123 Main St',
      type: 'AC Repair',
      scheduledAt: new Date(),
      tenantId: 'tenant-1',
      tenant: { name: 'Acme HVAC' },
      tech: { name: 'Carlos', phone: null },
    }])
    const result = await runAppointmentReminders()
    expect(emailAppointmentReminder).toHaveBeenCalledWith(
      'client@example.com',
      'Acme HVAC',
      expect.any(Object)
    )
    expect(result.processed).toBe(1)
  })

  it('records errors without throwing when DB fails', async () => {
    ;(prisma.job.findMany as jest.Mock).mockRejectedValue(new Error('DB down'))
    const result = await runAppointmentReminders()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('DB down')
  })
})
