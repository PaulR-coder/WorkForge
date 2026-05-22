/**
 * Unit tests for src/lib/permissions.ts
 *
 * The permissions module exports:
 *   can(role, permission) → boolean
 *   getPermissions(role)  → Record<string, boolean>
 *
 * Roles (most → least access): superadmin, admin, dispatcher, tech, readonly
 */

// We import the real module — no mocks needed because permissions.ts
// only imports from @prisma/client (type-only) and has no I/O side-effects.
// Jest resolves @/ via the moduleNameMapper in jest.config.ts.
import { can, getPermissions } from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Type workaround: permissions.ts imports `Role` from '@/generated/prisma/client'
// but Jest doesn't run Prisma generate. The Role type is just a union of strings,
// so we cast via `as Parameters<typeof can>[0]` throughout.
// ---------------------------------------------------------------------------
type Role = Parameters<typeof can>[0]

const r = (s: string) => s as Role

// ---------------------------------------------------------------------------
// can() helper
// ---------------------------------------------------------------------------

describe('can(role, permission)', () => {
  it('returns false for a totally unknown permission on any role', () => {
    expect(can(r('superadmin'), 'nonExistentPermission')).toBe(false)
    expect(can(r('readonly'), 'nonExistentPermission')).toBe(false)
  })

  it('returns false when a role is unknown (falls back to ?? false)', () => {
    // Cast an invented role to bypass TS — runtime should return false gracefully.
    expect(can('ghost' as Role, 'viewDashboard')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// superadmin — can do everything
// ---------------------------------------------------------------------------

describe('superadmin', () => {
  const role = r('superadmin')

  it('can view dashboard', () => expect(can(role, 'viewDashboard')).toBe(true))
  it('can create jobs', () => expect(can(role, 'createJob')).toBe(true))
  it('can edit jobs', () => expect(can(role, 'editJob')).toBe(true))
  it('can delete jobs', () => expect(can(role, 'deleteJob')).toBe(true))
  it('can assign techs', () => expect(can(role, 'assignTech')).toBe(true))
  it('can view financials', () => expect(can(role, 'viewFinancials')).toBe(true))
  it('can create invoices', () => expect(can(role, 'createInvoice')).toBe(true))
  it('can edit invoices', () => expect(can(role, 'editInvoice')).toBe(true))
  it('can collect payment', () => expect(can(role, 'collectPayment')).toBe(true))
  it('can view audit log', () => expect(can(role, 'viewAudit')).toBe(true))
  it('can manage users', () => expect(can(role, 'manageUsers')).toBe(true))
  it('can manage settings', () => expect(can(role, 'manageSettings')).toBe(true))
  it('can manage billing', () => expect(can(role, 'manageBilling')).toBe(true))
  it('has exclusive superAdminView permission', () => expect(can(role, 'superAdminView')).toBe(true))
  it('can import data', () => expect(can(role, 'importData')).toBe(true))
  it('can archive jobs', () => expect(can(role, 'archiveJob')).toBe(true))
  it('can view team map', () => expect(can(role, 'viewTeamMap')).toBe(true))
  it('can create estimates', () => expect(can(role, 'createEstimate')).toBe(true))
})

// ---------------------------------------------------------------------------
// admin — almost same as superadmin but no superAdminView
// ---------------------------------------------------------------------------

describe('admin', () => {
  const role = r('admin')

  it('can create, edit, and delete jobs', () => {
    expect(can(role, 'createJob')).toBe(true)
    expect(can(role, 'editJob')).toBe(true)
    expect(can(role, 'deleteJob')).toBe(true)
  })

  it('can manage users and settings', () => {
    expect(can(role, 'manageUsers')).toBe(true)
    expect(can(role, 'manageSettings')).toBe(true)
  })

  it('does NOT have superAdminView', () => {
    expect(can(role, 'superAdminView')).toBe(false)
  })

  it('can view financials and manage billing', () => {
    expect(can(role, 'viewFinancials')).toBe(true)
    expect(can(role, 'manageBilling')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dispatcher
// ---------------------------------------------------------------------------

describe('dispatcher', () => {
  const role = r('dispatcher')

  it('can create and edit jobs', () => {
    expect(can(role, 'createJob')).toBe(true)
    expect(can(role, 'editJob')).toBe(true)
  })

  it('cannot delete jobs', () => {
    expect(can(role, 'deleteJob')).toBe(false)
  })

  it('can assign techs', () => {
    expect(can(role, 'assignTech')).toBe(true)
  })

  it('cannot view financials or manage billing', () => {
    expect(can(role, 'viewFinancials')).toBe(false)
    expect(can(role, 'manageBilling')).toBe(false)
  })

  it('cannot manage users or settings', () => {
    expect(can(role, 'manageUsers')).toBe(false)
    expect(can(role, 'manageSettings')).toBe(false)
  })

  it('can view equipment and contracts', () => {
    expect(can(role, 'viewEquipment')).toBe(true)
    expect(can(role, 'viewContracts')).toBe(true)
  })

  it('cannot edit equipment or contracts', () => {
    expect(can(role, 'editEquipment')).toBe(false)
    expect(can(role, 'editContracts')).toBe(false)
  })

  it('can archive jobs and view team map', () => {
    expect(can(role, 'archiveJob')).toBe(true)
    expect(can(role, 'viewTeamMap')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// tech — sees only their own jobs, limited destructive actions
// ---------------------------------------------------------------------------

describe('tech', () => {
  const role = r('tech')

  it('cannot create or delete jobs (only edit)', () => {
    expect(can(role, 'createJob')).toBe(false)
    expect(can(role, 'deleteJob')).toBe(false)
    expect(can(role, 'editJob')).toBe(true)
  })

  it('cannot assign techs', () => {
    expect(can(role, 'assignTech')).toBe(false)
  })

  it('cannot view financials', () => {
    expect(can(role, 'viewFinancials')).toBe(false)
  })

  it('can collect payment', () => {
    expect(can(role, 'collectPayment')).toBe(true)
  })

  it('cannot create or edit invoices', () => {
    expect(can(role, 'createInvoice')).toBe(false)
    expect(can(role, 'editInvoice')).toBe(false)
  })

  it('cannot manage users or settings', () => {
    expect(can(role, 'manageUsers')).toBe(false)
    expect(can(role, 'manageSettings')).toBe(false)
  })

  it('can view equipment but not edit it', () => {
    expect(can(role, 'viewEquipment')).toBe(true)
    expect(can(role, 'editEquipment')).toBe(false)
  })

  it('can share location (tech-exclusive)', () => {
    expect(can(role, 'shareLocation')).toBe(true)
  })

  it('cannot view team map (dispatchers and above only)', () => {
    expect(can(role, 'viewTeamMap')).toBe(false)
  })

  it('cannot archive jobs', () => {
    expect(can(role, 'archiveJob')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// readonly — view-only, no destructive actions
// ---------------------------------------------------------------------------

describe('readonly', () => {
  const role = r('readonly')

  it('can view dashboard', () => {
    expect(can(role, 'viewDashboard')).toBe(true)
  })

  it('cannot create, edit, or delete jobs', () => {
    expect(can(role, 'createJob')).toBe(false)
    expect(can(role, 'editJob')).toBe(false)
    expect(can(role, 'deleteJob')).toBe(false)
  })

  it('cannot assign techs', () => {
    expect(can(role, 'assignTech')).toBe(false)
  })

  it('cannot view financials', () => {
    expect(can(role, 'viewFinancials')).toBe(false)
  })

  it('cannot create or edit invoices', () => {
    expect(can(role, 'createInvoice')).toBe(false)
    expect(can(role, 'editInvoice')).toBe(false)
  })

  it('cannot collect payment', () => {
    expect(can(role, 'collectPayment')).toBe(false)
  })

  it('cannot view audit log', () => {
    expect(can(role, 'viewAudit')).toBe(false)
  })

  it('cannot manage users, settings, or billing', () => {
    expect(can(role, 'manageUsers')).toBe(false)
    expect(can(role, 'manageSettings')).toBe(false)
    expect(can(role, 'manageBilling')).toBe(false)
  })

  it('can view equipment and contracts but not edit them', () => {
    expect(can(role, 'viewEquipment')).toBe(true)
    expect(can(role, 'viewContracts')).toBe(true)
    expect(can(role, 'editEquipment')).toBe(false)
    expect(can(role, 'editContracts')).toBe(false)
  })

  it('cannot archive jobs', () => {
    expect(can(role, 'archiveJob')).toBe(false)
  })

  it('can view history', () => {
    expect(can(role, 'viewHistory')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getPermissions()
// ---------------------------------------------------------------------------

describe('getPermissions(role)', () => {
  it('returns an object for known roles', () => {
    const perms = getPermissions(r('admin'))
    expect(typeof perms).toBe('object')
    expect(perms).not.toBeNull()
  })

  it('returns an empty object for unknown roles', () => {
    expect(getPermissions('ghost' as Role)).toEqual({})
  })

  it('superadmin permissions object includes all expected keys', () => {
    const perms = getPermissions(r('superadmin'))
    const expected = [
      'viewDashboard', 'createJob', 'editJob', 'deleteJob',
      'assignTech', 'viewFinancials', 'manageUsers', 'superAdminView',
    ]
    for (const key of expected) {
      expect(perms).toHaveProperty(key)
    }
  })

  it('readonly permissions are consistent with can() results', () => {
    const perms = getPermissions(r('readonly'))
    // Every key returned by getPermissions should match can() for that key
    for (const [key, value] of Object.entries(perms)) {
      expect(can(r('readonly'), key)).toBe(value)
    }
  })
})
