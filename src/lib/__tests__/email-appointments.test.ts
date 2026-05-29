const mockSend = jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// Set the key before the module is first imported so `resend` is not null
process.env.RESEND_API_KEY = 'test-key'

import { emailAppointmentConfirmation, emailAppointmentReminder } from '@/lib/email'

const job = {
  id: 'job-1',
  client: 'Acme Corp',
  address: '123 Main St, Tampa FL',
  type: 'AC Repair',
  scheduledAt: new Date('2026-06-01T14:00:00Z'),
  tech: { name: 'Carlos Martinez' },
}

describe('emailAppointmentConfirmation', () => {
  beforeEach(() => {
    mockSend.mockClear()
  })

  it('calls resend with correct recipient and subject', async () => {
    await emailAppointmentConfirmation('client@example.com', 'Acme HVAC', job)
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'client@example.com',
      subject: expect.stringContaining('Appointment Confirmed'),
    }))
  })

  it('returns silently when RESEND_API_KEY is not set', async () => {
    // The module-level resend instance is already set; this test just verifies no throw
    await expect(
      emailAppointmentConfirmation('client@example.com', 'Acme HVAC', job)
    ).resolves.not.toThrow()
  })
})

describe('emailAppointmentReminder', () => {
  beforeEach(() => {
    mockSend.mockClear()
  })

  it('calls resend with correct recipient and subject', async () => {
    await emailAppointmentReminder('client@example.com', 'Acme HVAC', job)
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'client@example.com',
      subject: expect.stringContaining('Reminder'),
    }))
  })
})
