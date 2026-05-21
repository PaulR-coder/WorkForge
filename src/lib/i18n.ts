export type Lang = 'en' | 'es'

const T = {
  en: {
    // Nav
    dashboard: 'Dashboard',
    workOrders: 'Work Orders',
    fieldView: 'Field View',
    schedule: 'Schedule',
    invoices: 'Invoices',
    payments: 'Payments',
    equipment: 'Equipment',
    contracts: 'Contracts',
    team: 'Team',
    auditLog: 'Audit Log',
    billing: 'Billing',
    commandCenter: 'Command Center',
    jobHistory: 'Job History',
    estimates: 'Estimates',
    signOut: 'Sign Out',

    // Auth
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    signInToAccount: 'Sign in to your account',
    secureFieldOps: 'Secure field operations platform',
    email: 'Email',
    password: 'Password',
    demoAccounts: 'Demo Accounts',
    invalidCredentials: 'Invalid credentials',
    connectionError: 'Connection error. Please try again.',

    // Jobs
    createWorkOrder: 'Create Work Order',
    newJob: '+ New Job',
    client: 'Client',
    clientName: 'Client name',
    jobType: 'Job Type',
    address: 'Address',
    jobSiteAddress: 'Job site address',
    priority: 'Priority',
    assignTech: 'Assign Tech',
    unassigned: 'Unassigned',
    description: 'Description',
    jobDetails: 'Job details...',
    cancel: 'Cancel',
    creating: 'Creating...',
    createJob: 'Create Job →',
    deleteJob: 'Delete this job? This cannot be undone.',
    syncedJustNow: 'synced just now',
    syncedAgo: 'ago',
    synced: 'synced',

    // Kanban columns
    open: 'Open',
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    done: 'Done',

    // Priority labels
    low: 'low',
    normal: 'normal',
    high: 'high',
    urgent: 'urgent',

    // Job Drawer
    status: 'Status',
    fullAddress: 'Full Address',
    assignedTech: 'Assigned Tech',
    change: 'Change',
    internalMessages: 'Internal Messages',
    noMessages: 'No messages yet — start the thread below',
    typeMessage: 'Type a message...',
    send: 'Send',
    collectPayment: '💳 Collect Payment',
    markComplete: '✓ Mark Complete',
    linkedInvoices: 'Invoices',
    linkedEquipment: 'Equipment',
    loading: 'Loading...',

    // Payment overlay
    paymentAmount: 'Payment Amount',
    continue: 'Continue →',
    cardNumber: 'Card Number',
    expiry: 'Expiry',
    cvv: 'CVV',
    customerSignature: 'Customer Signature',
    authorizeCharge: 'to authorize the',
    charge: 'charge',
    signHere: 'Sign here with mouse or finger',
    clear: 'Clear',
    back: '← Back',
    processing: 'Processing...',
    paymentCollected: 'Collected',
    paymentSuccess: 'Payment recorded · Card authorized · Signature captured',
    done2: 'Done ✓',
    collectPaymentTitle: 'Collect Payment',

    // Dashboard
    ownerDashboard: 'Owner Dashboard',
    realtimeBI: 'Real-time business intelligence',
    revenueCollected: 'Revenue Collected',
    outstanding: 'Outstanding',
    jobsCompleted: 'Jobs Completed',
    contractMRR: 'Contract MRR',
    overdueInvoices: 'invoice overdue',
    overdueInvoicesPlural: 'invoices overdue',
    pmAlert: 'equipment unit needs preventive maintenance',
    pmAlertPlural: 'equipment units need preventive maintenance',
    upcomingContracts: 'Upcoming Contract Jobs',
    recentInvoices: 'Recent Invoices',
    allCurrent: 'All current',

    // Invoices
    invoicesTitle: 'Invoices',
    all: 'All',
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    sendInvoice: 'Send',
    markPaid: 'Mark Paid',
    remind: 'Remind',
    pdf: '⬇ PDF',
    noInvoices: 'No invoices found',
    daysOverdue: 'days overdue',

    // Equipment
    equipmentTitle: 'Equipment & PM Tracking',
    units: 'units',
    totalServices: 'Total services',
    sinceLastPM: 'Since last PM',
    untilPMDue: 'Until PM due',
    pmOverdue: 'PM overdue',
    warranty: 'Warranty',
    pmHealth: 'PM interval health',
    remaining: '% remaining',

    // Contracts
    contractsTitle: 'Service Contracts',
    monthlyContractRevenue: 'Monthly Contract Revenue',
    jobsAutoCompleted: 'Jobs Completed',
    contractRetention: 'Contract Retention',
    dueThisWeek: 'Due This Week',
    perVisit: 'per visit',
    moMRR: '/mo MRR',
    untilNextJob: 'Until next job',
    autoScheduled: 'Auto-scheduled',
    active: 'Active',
    everyDays: 'Every',
    days: 'days',

    // Team
    teamTitle: 'Team',
    activeUsers: 'active users',

    // Audit
    auditTitle: 'Audit Log',
    immutableRecord: 'Immutable record of all system actions',
    noAuditEntries: 'No audit entries yet',

    // Payments
    paymentLedger: 'Payment Ledger',
    collected: 'collected',
    noPayments: 'No payments recorded yet',
    signed: '✓ Signed',

    // Schedule / calendar
    dispatchSchedule: 'Dispatch Schedule',
    unscheduledJobs: 'Unscheduled',
    noUnscheduledJobs: 'No unscheduled jobs',
    allTechs: 'All Techs',
    scheduledTime: 'Scheduled Time',
    setSchedule: 'Set date & time',
    clearSchedule: 'Clear',
    dragToSlot: 'Drag a job to a time slot to schedule it',

    // Field view
    myJobs: 'My Jobs',
    allCaughtUp: 'All caught up!',
    noActiveJobs: 'No active jobs assigned',
    activeTap: 'active · tap a job to expand',
    openInMaps: 'Open in Maps',
    fullAddressLabel: 'Full Address',
    jobNotes: 'Job Notes',
    scheduleAction: '📅 Schedule',
    onMyWayAction: '🚗 On My Way',
    completeAction: '✓ Complete Job',
    updating: 'Updating...',

    // History
    archive: 'Archive',
    archived: 'Archived',
    restore: 'Restore to Board',
    jobComplete: 'Job Complete!',
    createInvoice: 'Create Invoice →',
    notNow: 'Not Now',
    exportCsv: '⬇ Export CSV',
    noHistory: 'No completed jobs yet',
    searchHistory: 'Search by client or type...',
    completedOn: 'Completed',

    // Roles
    superadmin: 'Super Admin',
    admin: 'Admin',
    dispatcher: 'Dispatcher',
    tech: 'Technician',
    access: 'access',
  },

  es: {
    // Nav
    dashboard: 'Panel Principal',
    workOrders: 'Órdenes de Trabajo',
    fieldView: 'Vista de Campo',
    schedule: 'Agenda',
    invoices: 'Facturas',
    payments: 'Pagos',
    equipment: 'Equipos',
    contracts: 'Contratos',
    team: 'Equipo',
    auditLog: 'Registro de Auditoría',
    billing: 'Facturación',
    commandCenter: 'Centro de Mando',
    jobHistory: 'Historial de Trabajos',
    estimates: 'Presupuestos',
    signOut: 'Cerrar Sesión',

    // Auth
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando sesión...',
    signInToAccount: 'Inicia sesión en tu cuenta',
    secureFieldOps: 'Plataforma segura de operaciones en campo',
    email: 'Correo electrónico',
    password: 'Contraseña',
    demoAccounts: 'Cuentas de Demostración',
    invalidCredentials: 'Credenciales inválidas',
    connectionError: 'Error de conexión. Inténtalo de nuevo.',

    // Jobs
    createWorkOrder: 'Crear Orden de Trabajo',
    newJob: '+ Nueva Orden',
    client: 'Cliente',
    clientName: 'Nombre del cliente',
    jobType: 'Tipo de Trabajo',
    address: 'Dirección',
    jobSiteAddress: 'Dirección del sitio',
    priority: 'Prioridad',
    assignTech: 'Asignar Técnico',
    unassigned: 'Sin asignar',
    description: 'Descripción',
    jobDetails: 'Detalles del trabajo...',
    cancel: 'Cancelar',
    creating: 'Creando...',
    createJob: 'Crear Orden →',
    deleteJob: '¿Eliminar esta orden? Esta acción no se puede deshacer.',
    syncedJustNow: 'sincronizado ahora',
    syncedAgo: 'hace',
    synced: 'sincronizado',

    // Kanban columns
    open: 'Abierto',
    scheduled: 'Programado',
    inProgress: 'En Progreso',
    done: 'Completado',

    // Priority labels
    low: 'baja',
    normal: 'normal',
    high: 'alta',
    urgent: 'urgente',

    // Job Drawer
    status: 'Estado',
    fullAddress: 'Dirección Completa',
    assignedTech: 'Técnico Asignado',
    change: 'Cambiar',
    internalMessages: 'Mensajes Internos',
    noMessages: 'Sin mensajes — inicia la conversación abajo',
    typeMessage: 'Escribe un mensaje...',
    send: 'Enviar',
    collectPayment: '💳 Cobrar Pago',
    markComplete: '✓ Marcar Completo',
    linkedInvoices: 'Facturas',
    linkedEquipment: 'Equipos',
    loading: 'Cargando...',

    // Payment overlay
    paymentAmount: 'Monto del Pago',
    continue: 'Continuar →',
    cardNumber: 'Número de Tarjeta',
    expiry: 'Vencimiento',
    cvv: 'CVV',
    customerSignature: 'Firma del Cliente',
    authorizeCharge: 'para autorizar el cobro de',
    charge: '',
    signHere: 'Firma aquí con el ratón o dedo',
    clear: 'Limpiar',
    back: '← Atrás',
    processing: 'Procesando...',
    paymentCollected: 'Cobrado',
    paymentSuccess: 'Pago registrado · Tarjeta autorizada · Firma capturada',
    done2: 'Listo ✓',
    collectPaymentTitle: 'Cobrar Pago',

    // Dashboard
    ownerDashboard: 'Panel del Dueño',
    realtimeBI: 'Inteligencia de negocio en tiempo real',
    revenueCollected: 'Ingresos Cobrados',
    outstanding: 'Por Cobrar',
    jobsCompleted: 'Trabajos Completados',
    contractMRR: 'MRR de Contratos',
    overdueInvoices: 'factura vencida',
    overdueInvoicesPlural: 'facturas vencidas',
    pmAlert: 'equipo necesita mantenimiento preventivo',
    pmAlertPlural: 'equipos necesitan mantenimiento preventivo',
    upcomingContracts: 'Próximos Trabajos de Contrato',
    recentInvoices: 'Facturas Recientes',
    allCurrent: 'Al corriente',

    // Invoices
    invoicesTitle: 'Facturas',
    all: 'Todas',
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    overdue: 'Vencida',
    sendInvoice: 'Enviar',
    markPaid: 'Marcar Pagada',
    remind: 'Recordatorio',
    pdf: '⬇ PDF',
    noInvoices: 'No se encontraron facturas',
    daysOverdue: 'días vencida',

    // Equipment
    equipmentTitle: 'Equipos y Mantenimiento Preventivo',
    units: 'unidades',
    totalServices: 'Servicios totales',
    sinceLastPM: 'Desde último MP',
    untilPMDue: 'Hasta próximo MP',
    pmOverdue: 'MP vencido',
    warranty: 'Garantía',
    pmHealth: 'Salud del intervalo MP',
    remaining: '% restante',

    // Contracts
    contractsTitle: 'Contratos de Servicio',
    monthlyContractRevenue: 'Ingresos Mensuales por Contrato',
    jobsAutoCompleted: 'Trabajos Completados',
    contractRetention: 'Retención de Contratos',
    dueThisWeek: 'Esta Semana',
    perVisit: 'por visita',
    moMRR: '/mes MRR',
    untilNextJob: 'Hasta próximo trabajo',
    autoScheduled: 'Auto-programado',
    active: 'Activo',
    everyDays: 'Cada',
    days: 'días',

    // Team
    teamTitle: 'Equipo',
    activeUsers: 'usuarios activos',

    // Audit
    auditTitle: 'Registro de Auditoría',
    immutableRecord: 'Registro inmutable de todas las acciones del sistema',
    noAuditEntries: 'Sin entradas de auditoría aún',

    // Payments
    paymentLedger: 'Libro de Pagos',
    collected: 'cobrado',
    noPayments: 'No hay pagos registrados aún',
    signed: '✓ Firmado',

    // Schedule / calendar
    dispatchSchedule: 'Agenda de Despacho',
    unscheduledJobs: 'Sin Programar',
    noUnscheduledJobs: 'No hay órdenes sin programar',
    allTechs: 'Todos los Técnicos',
    scheduledTime: 'Hora Programada',
    setSchedule: 'Fecha y hora',
    clearSchedule: 'Limpiar',
    dragToSlot: 'Arrastra una orden a un horario para programarla',

    // Field view
    myJobs: 'Mis Trabajos',
    allCaughtUp: '¡Todo al día!',
    noActiveJobs: 'No hay trabajos activos asignados',
    activeTap: 'activos · toca un trabajo para ver detalles',
    openInMaps: 'Abrir en Mapas',
    fullAddressLabel: 'Dirección Completa',
    jobNotes: 'Notas del Trabajo',
    scheduleAction: '📅 Programar',
    onMyWayAction: '🚗 En Camino',
    completeAction: '✓ Completar Trabajo',
    updating: 'Actualizando...',

    // History
    archive: 'Archivar',
    archived: 'Archivado',
    restore: 'Restaurar al Tablero',
    jobComplete: '¡Trabajo Completado!',
    createInvoice: 'Crear Factura →',
    notNow: 'Ahora No',
    exportCsv: '⬇ Exportar CSV',
    noHistory: 'No hay trabajos completados aún',
    searchHistory: 'Buscar por cliente o tipo...',
    completedOn: 'Completado',

    // Roles
    superadmin: 'Super Admin',
    admin: 'Admin',
    dispatcher: 'Despachador',
    tech: 'Técnico',
    access: 'acceso',
  },
} as const

export type TKeys = keyof typeof T.en

export function tx(lang: Lang, key: TKeys): string {
  return T[lang][key] ?? T.en[key] ?? key
}

export const TRANSLATIONS = T
