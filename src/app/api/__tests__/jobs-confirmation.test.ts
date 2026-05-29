/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/jobs/[id]/route'

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({
    id: 'user-1', role: 'admin', tenantId: 'tenant-1',
    email: 'admin@test.com', name: 'Admin', initials: 'A', company: 'Test Co',
  }),
}))

jest.mock('@/lib/email', () => ({
  emailAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
  emailJobAssigned: jest.fn().mockResolvedValue(undefined),
  emailJobCompleted: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/sms', () => ({
  smsJobAssigned: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/push', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/cache', () => ({
  cache: { flush: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/prisma', () => ({
  tenantPrisma: jest.fn().mockReturnValue({
    job: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'job-1', client: 'Acme', clientEmail: 'client@example.com',
        clientPhone: null, type: 'AC Repair', address: '123 Main', status: 'open',
        scheduledAt: null, completedAt: null, updatedAt: new Date(), tech: null,
        tenantId: 'tenant-1', tenant: { name: 'Acme HVAC' },
        techId: null,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'job-1', client: 'Acme', clientEmail: 'client@example.com',
        address: '123 Main', type: 'AC Repair',
        status: 'scheduled', scheduledAt: new Date('2026-06-01T14:00:00Z'),
        tech: null, archivedAt: null, tenant: { name: 'Acme HVAC' },
        priority: 'normal',
      }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    pushSubscription: { findMany: jest.fn().mockResolvedValue([]) },
  }),
}))

import { emailAppointmentConfirmation } from '@/lib/email'

describe('PATCH /api/jobs/[id] — appointment confirmation', () => {
  it('sends confirmation email when scheduledAt is newly set and clientEmail exists', async () => {
    const req = new Request('http://localhost/api/jobs/job-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-06-01T14:00:00Z' }),
    })
    const params = Promise.resolve({ id: 'job-1' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    // Allow fire-and-forget promise to settle
    await new Promise(r => setTimeout(r, 0))
    expect(emailAppointmentConfirmation).toHaveBeenCalledWith(
      'client@example.com',
      'Acme HVAC',
      expect.objectContaining({ id: 'job-1' })
    )
  })

  it('does NOT send confirmation when scheduledAt was already set', async () => {
    const { tenantPrisma } = require('@/lib/prisma')
    const mockDb = tenantPrisma()
    mockDb.job.findFirst.mockResolvedValueOnce({
      id: 'job-1', client: 'Acme', clientEmail: 'client@example.com',
      clientPhone: null, type: 'AC Repair', address: '123 Main', status: 'scheduled',
      scheduledAt: new Date('2026-05-01T10:00:00Z'), completedAt: null, updatedAt: new Date(),
      tech: null, tenantId: 'tenant-1', tenant: { name: 'Acme HVAC' }, techId: null,
    })
    ;(emailAppointmentConfirmation as jest.Mock).mockClear()

    const req = new Request('http://localhost/api/jobs/job-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-06-01T14:00:00Z' }),
    })
    const params = Promise.resolve({ id: 'job-1' })
    await PATCH(req, { params })
    await new Promise(r => setTimeout(r, 0))
    expect(emailAppointmentConfirmation).not.toHaveBeenCalled()
  })

  it('does NOT send confirmation when clientEmail is missing', async () => {
    const { tenantPrisma } = require('@/lib/prisma')
    const mockDb = tenantPrisma()
    mockDb.job.findFirst.mockResolvedValueOnce({
      id: 'job-1', client: 'Acme', clientEmail: null,
      clientPhone: null, type: 'AC Repair', address: '123 Main', status: 'open',
      scheduledAt: null, completedAt: null, updatedAt: new Date(),
      tech: null, tenantId: 'tenant-1', tenant: { name: 'Acme HVAC' }, techId: null,
    })
    mockDb.job.update.mockResolvedValueOnce({
      id: 'job-1', client: 'Acme', clientEmail: null,
      address: '123 Main', type: 'AC Repair',
      status: 'scheduled', scheduledAt: new Date('2026-06-01T14:00:00Z'),
      tech: null, archivedAt: null, tenant: { name: 'Acme HVAC' }, priority: 'normal',
    })
    ;(emailAppointmentConfirmation as jest.Mock).mockClear()

    const req = new Request('http://localhost/api/jobs/job-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-06-01T14:00:00Z' }),
    })
    const params = Promise.resolve({ id: 'job-1' })
    await PATCH(req, { params })
    await new Promise(r => setTimeout(r, 0))
    expect(emailAppointmentConfirmation).not.toHaveBeenCalled()
  })
})
