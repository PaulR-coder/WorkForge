import twilio from 'twilio'

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null
const FROM = process.env.TWILIO_FROM ?? ''

export async function smsJobAssigned(
  phone: string,
  job: { client: string; address: string; type: string },
) {
  if (!client || !FROM || !phone) return
  await client.messages
    .create({
      from: FROM,
      to: phone,
      body: `WorkForge: New job — ${job.type} for ${job.client} at ${job.address}`,
    })
    .catch(console.error)
}

export async function smsAppointmentReminder(
  phone: string,
  job: { client: string; address: string; type: string; scheduledAt: Date | string }
): Promise<void> {
  if (!client || !phone) return
  const date = new Date(job.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(job.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await client.messages.create({
    from: FROM,
    to: phone,
    body: `WorkForge reminder: ${job.type} for ${job.client} tomorrow ${date} at ${time} — ${job.address}`,
  }).catch(console.error)
}
