import { emailAppointmentConfirmation, emailAppointmentReminder } from '@/lib/email'

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }) },
  })),
}))

const job = {
  id: 'job-1',
  client: 'Acme Corp',
  address: '123 Main St, Tampa FL',
  type: 'AC Repair',
  scheduledAt: new Date('2026-06-01T14:00:00Z'),
  tech: { name: 'Carlos Martinez' },
}

describe('emailAppointmentConfirmation', () => {
  it('returns without throwing when called with valid args', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    await expect(
      emailAppointmentConfirmation('client@example.com', 'Acme HVAC', job)
    ).resolves.not.toThrow()
  })

  it('returns silently when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    await expect(
      emailAppointmentConfirmation('client@example.com', 'Acme HVAC', job)
    ).resolves.not.toThrow()
  })
})

describe('emailAppointmentReminder', () => {
  it('returns without throwing when called with valid args', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    await expect(
      emailAppointmentReminder('client@example.com', 'Acme HVAC', job)
    ).resolves.not.toThrow()
  })
})
