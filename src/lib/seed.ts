import { prisma } from './prisma'
import { hashPassword } from './auth'

export async function seedDatabase() {
  const count = await prisma.user.count()
  if (count > 0) return

  const users = [
    { email: 'superadmin@workforge.io', name: 'Super Admin', password: 'admin123', role: 'superadmin' as const, initials: 'SA', company: 'WorkForge', specialty: 'Platform Admin' },
    { email: 'owner@acmefield.com', name: 'Alex Owner', password: 'owner123', role: 'admin' as const, initials: 'AO', company: 'Acme Field Services', specialty: 'Owner' },
    { email: 'dispatch@acmefield.com', name: 'Diana Dispatch', password: 'disp123', role: 'dispatcher' as const, initials: 'DD', company: 'Acme Field Services', specialty: 'Dispatcher' },
    { email: 'carlos@acmefield.com', name: 'Carlos Martinez', password: 'tech123', role: 'tech' as const, initials: 'CM', company: 'Acme Field Services', specialty: 'HVAC' },
    { email: 'client@metalpack.com', name: 'MetalPack Client', password: 'view123', role: 'readonly' as const, initials: 'MP', company: 'MetalPack Industries', specialty: '' },
  ]

  for (const u of users) {
    await prisma.user.create({
      data: { ...u, password: await hashPassword(u.password) },
    })
  }

  const carlos = await prisma.user.findUnique({ where: { email: 'carlos@acmefield.com' } })
  const admin = await prisma.user.findUnique({ where: { email: 'owner@acmefield.com' } })

  await prisma.job.createMany({
    data: [
      { client: 'MetalPack Industries', address: '1400 Industrial Blvd, Tampa FL', type: 'HVAC', priority: 'high', status: 'in_progress', description: 'Compressor #3 diagnostic — unusual vibration reported', techId: carlos?.id },
      { client: 'BioFarm Processing', address: '800 Bio Park Dr, Tampa FL', type: 'Electrical', priority: 'normal', status: 'scheduled', description: 'Panel inspection and load balancing', techId: carlos?.id },
      { client: 'Industrial Air Co.', address: '500 Commerce Way, Brandon FL', type: 'Refrigeration', priority: 'urgent', status: 'open', description: 'Walk-in cooler temp rising — possible refrigerant leak' },
      { client: 'North Medical Center', address: '200 Health Blvd, Clearwater FL', type: 'Maintenance', priority: 'normal', status: 'done', description: 'Monthly PM complete — all systems nominal', techId: carlos?.id, completedAt: new Date() },
      { client: 'Gulf Coast Cooling', address: '320 Gulf Dr, St Petersburg FL', type: 'HVAC', priority: 'low', status: 'open', description: 'Routine filter replacement and coil cleaning' },
    ],
  })

  await prisma.equipment.createMany({
    data: [
      { client: 'MetalPack Industries', name: 'Air Compressor #3', brand: 'Ingersoll Rand', model: 'R75', serialNumber: 'IR-75-2019-0342', icon: '⚙', installedAt: new Date('2019-03-01'), warrantyEnd: new Date('2024-03-01'), intervalDays: 90, lastPMDaysAgo: 47, totalServices: 12, notes: 'Capacitor replaced Apr 2026. Check belts next visit.' },
      { client: 'MetalPack Industries', name: 'Chiller Unit A', brand: 'York', model: 'YVAA', serialNumber: 'YK-YVAA-2021-7788', icon: '❄', installedAt: new Date('2021-01-01'), warrantyEnd: new Date('2026-01-01'), intervalDays: 180, lastPMDaysAgo: 12, totalServices: 7, notes: 'Operating within spec. Next PM due Aug 2026.' },
      { client: 'BioFarm Processing', name: 'HVAC Unit B2', brand: 'Carrier', model: '30XA', serialNumber: 'CA-30XA-2020-4411', icon: '🌡', installedAt: new Date('2020-06-01'), warrantyEnd: new Date('2025-06-01'), intervalDays: 90, lastPMDaysAgo: 22, totalServices: 9, notes: 'All systems normal.' },
      { client: 'North Medical Center', name: 'Boiler #1', brand: 'Cleaver Brooks', model: 'CB-100', serialNumber: 'CB-100-2015-2291', icon: '🔥', installedAt: new Date('2015-11-01'), warrantyEnd: new Date('2020-11-01'), intervalDays: 30, lastPMDaysAgo: 18, totalServices: 38, notes: 'Critical unit. Monthly PM required. Code compliant.' },
    ],
  })

  await prisma.contract.createMany({
    data: [
      { client: 'MetalPack Industries', name: 'Full Plant PM Contract', icon: '⚙', units: 6, techInitials: 'CM', frequencyDays: 90, pricePerVisit: 2400, nextDueDate: new Date(Date.now() + 13 * 86400000), jobsCompleted: 8, active: true, notes: 'Priority response within 4 hours.' },
      { client: 'BioFarm Processing', name: 'HVAC Biannual Service', icon: '❄', units: 4, techInitials: 'CM', frequencyDays: 180, pricePerVisit: 1800, nextDueDate: new Date(Date.now() + 38 * 86400000), jobsCompleted: 4, active: true, notes: 'Includes refrigerant check and coil cleaning.' },
      { client: 'North Medical Center', name: 'Monthly Compliance PM', icon: '🏥', units: 8, techInitials: 'CM', frequencyDays: 30, pricePerVisit: 950, nextDueDate: new Date(Date.now() + 5 * 86400000), jobsCompleted: 18, active: true, notes: 'Compliance documentation required every visit.' },
    ],
  })

  await prisma.invoice.createMany({
    data: [
      { number: 'INV-047', client: 'MetalPack Industries', labor: 332.50, parts: 48, surcharge: 75, total: 455, status: 'sent', dueDate: new Date(Date.now() + 15 * 86400000) },
      { number: 'INV-046', client: 'BioFarm Processing', labor: 570, parts: 185, surcharge: 65, total: 820, status: 'paid', dueDate: new Date(Date.now() - 5 * 86400000), paidAt: new Date() },
      { number: 'INV-044', client: 'Industrial Air Co.', labor: 920, parts: 245, surcharge: 75, total: 1240, status: 'overdue', dueDate: new Date(Date.now() - 20 * 86400000) },
      { number: 'INV-050', client: 'North Medical Center', labor: 760, parts: 115, surcharge: 75, total: 950, status: 'draft', dueDate: new Date(Date.now() + 15 * 86400000) },
    ],
  })

  await prisma.notificationRule.createMany({
    data: [
      { icon: '💬', title: 'Tech On My Way — SMS to Client', description: 'Sent when technician taps "On My Way" status', template: 'Hi, this is {company}. Your technician {tech} is on the way. Est. arrival: {eta}.', channel: 'SMS', active: true },
      { icon: '📧', title: 'Job Completed — Email Report to Client', description: 'Sends service report PDF when job is marked complete', template: 'Service report for your {job_type} service at {address}. Please find the attached PDF.', channel: 'Email', active: true },
      { icon: '📧', title: 'Invoice Sent — Email to Client', description: 'Delivery of invoice PDF with payment link', template: 'Invoice {inv_id} for ${amount} is attached. Payment due: {due_date}.', channel: 'Email', active: true },
      { icon: '🔔', title: 'Invoice Overdue — Auto Reminder', description: 'Automatic reminder at 7 and 14 days after due date', template: 'Friendly reminder: Invoice {inv_id} for ${amount} is overdue. Please remit payment.', channel: 'Email + SMS', active: true },
      { icon: '📱', title: 'New Job Assigned — Push to Technician', description: 'Instant notification when dispatcher assigns a job', template: 'New job assigned: {client} at {address}. Priority: {priority}. Tap to accept.', channel: 'Push', active: true },
    ],
  })

  if (admin) {
    await prisma.auditLog.createMany({
      data: [
        { icon: '🔐', action: 'System initialized', detail: 'WorkForge database seeded with demo data', severity: 'info', userId: admin.id },
        { icon: '👤', action: 'Demo users created', detail: '5 users across all roles', severity: 'info', userId: admin.id },
      ],
    })
  }
}
