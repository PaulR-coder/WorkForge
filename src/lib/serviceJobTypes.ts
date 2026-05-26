export const SERVICE_TYPES = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Landscaping',
  'Junk Removal',
  'Construction',
] as const

export type ServiceType = typeof SERVICE_TYPES[number]

export const DEFAULT_JOB_TYPES: Record<string, string[]> = {
  HVAC: [
    'AC Repair',
    'Furnace Tune-Up',
    'Duct Cleaning',
    'AC Installation',
    'Heat Pump Service',
    'Filter Replacement',
  ],
  Plumbing: [
    'Drain Cleaning',
    'Leak Repair',
    'Water Heater Install',
    'Pipe Replacement',
    'Faucet Repair',
    'Sewer Line Inspection',
  ],
  Electrical: [
    'Panel Upgrade',
    'Outlet Installation',
    'Lighting Install',
    'Wiring Repair',
    'Safety Inspection',
    'Generator Install',
  ],
  Landscaping: [
    'Lawn Mowing',
    'Hedge Trimming',
    'Tree Removal',
    'Irrigation Repair',
    'Sod Installation',
    'Fertilization',
  ],
  'Junk Removal': [
    'Full Property Cleanout',
    'Furniture Removal',
    'Appliance Haul Away',
    'Yard Debris Removal',
    'Construction Debris',
    'Same-Day Pickup',
  ],
  Construction: [
    'Drywall Repair',
    'Flooring Install',
    'Interior Painting',
    'Deck Construction',
    'Room Addition',
    'Kitchen Remodel',
  ],
}

export function getJobTypesForServices(services: string[]): string[] {
  const names = new Set<string>()
  for (const s of services) {
    const types = DEFAULT_JOB_TYPES[s]
    if (types) types.forEach(t => names.add(t))
  }
  return [...names]
}
