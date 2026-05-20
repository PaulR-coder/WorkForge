import type { Role } from '@/generated/prisma/client'

const PERMISSIONS: Partial<Record<Role, Record<string, boolean>>> = {
  superadmin: {
    viewDashboard: true, createJob: true, editJob: true, deleteJob: true,
    assignTech: true, viewFinancials: true, createInvoice: true, editInvoice: true,
    collectPayment: true, viewAudit: true, manageUsers: true, manageSettings: true,
    viewEquipment: true, editEquipment: true, viewContracts: true, editContracts: true,
    manageBilling: true, superAdminView: true, archiveJob: true, viewHistory: true,
    viewTeamMap: true,
  },
  admin: {
    viewDashboard: true, createJob: true, editJob: true, deleteJob: true,
    assignTech: true, viewFinancials: true, createInvoice: true, editInvoice: true,
    collectPayment: true, viewAudit: true, manageUsers: true, manageSettings: true,
    viewEquipment: true, editEquipment: true, viewContracts: true, editContracts: true,
    manageBilling: true, archiveJob: true, viewHistory: true,
    viewTeamMap: true,
  },
  dispatcher: {
    viewDashboard: false, createJob: true, editJob: true, deleteJob: false,
    assignTech: true, viewFinancials: false, createInvoice: false, editInvoice: false,
    collectPayment: false, viewAudit: false, manageUsers: false, manageSettings: false,
    viewEquipment: true, editEquipment: false, viewContracts: true, editContracts: false,
    archiveJob: true, viewHistory: true,
    viewTeamMap: true,
  },
  tech: {
    viewDashboard: false, createJob: false, editJob: true, deleteJob: false,
    assignTech: false, viewFinancials: false, createInvoice: false, editInvoice: false,
    collectPayment: true, viewAudit: false, manageUsers: false, manageSettings: false,
    viewEquipment: true, editEquipment: false, viewContracts: false, editContracts: false,
    archiveJob: false, viewHistory: true,
    shareLocation: true,
  },
  readonly: {
    viewDashboard: true, createJob: false, editJob: false, deleteJob: false,
    assignTech: false, viewFinancials: false, createInvoice: false, editInvoice: false,
    collectPayment: false, viewAudit: false, manageUsers: false, manageSettings: false,
    viewEquipment: true, editEquipment: false, viewContracts: true, editContracts: false,
    manageBilling: false, archiveJob: false, viewHistory: true,
  },
}

export function can(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.[permission] ?? false
}

export function getPermissions(role: Role) {
  return PERMISSIONS[role] ?? {}
}
