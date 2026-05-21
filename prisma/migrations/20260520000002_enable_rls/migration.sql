-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Equipment"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Photo"            ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table-owner DB role (Railway's app user)
ALTER TABLE "User"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invite"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "Job"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"          FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment"          FORCE ROW LEVEL SECURITY;
ALTER TABLE "Equipment"        FORCE ROW LEVEL SECURITY;
ALTER TABLE "Contract"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "Message"          FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationRule" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "Photo"            FORCE ROW LEVEL SECURITY;

-- Tenant isolation policies
-- Three cases are allowed:
--   1. app.is_superadmin = 'true'  → full cross-tenant access (superadmin role)
--   2. app.tenant_id = <id>        → strict isolation to that tenant's rows
--   3. app.tenant_id = ''          → no context set (pre-auth routes, cron jobs);
--                                    passes through so app-level filtering applies

CREATE POLICY tenant_isolation ON "User"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Invite"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Job"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Invoice"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Payment"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Equipment"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Contract"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Message"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "NotificationRule"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "AuditLog"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY tenant_isolation ON "Photo"
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );
