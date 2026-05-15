import { prisma } from '@/lib/prisma'
import { emailJobAssigned } from '@/lib/email'

export async function GET() {
  const carlos = await prisma.user.findFirst({ where: { role: 'tech' } })
  const job = await prisma.job.findFirst()

  if (!carlos || !job) return Response.json({ error: 'No tech or job found' })

  console.log('[test-notify] sending to', carlos.email)
  await emailJobAssigned(carlos.email, carlos.name, {
    client: job.client,
    address: job.address,
    type: job.type,
    priority: job.priority,
  })

  return Response.json({ sentTo: carlos.email, job: job.client })
}
