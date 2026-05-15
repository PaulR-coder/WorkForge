import twilio from 'twilio'

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null
const FROM = process.env.TWILIO_FROM_NUMBER ?? ''

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
