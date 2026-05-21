-- Fix RLS bypass for pre-auth connections.
--
-- current_setting('app.tenant_id', true) returns NULL (not '') when the GUC
-- was never set in the session, so the previous `= ''` comparison evaluated
-- to NULL (falsy) and blocked every row on raw-prisma callers (login, seed,
-- health).  COALESCE converts NULL → '' so unset sessions pass through as
-- intended, while authenticated sessions with a real tenant ID are still
-- correctly isolated.

ALTER POLICY tenant_isolation ON "User"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Invite"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Job"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Invoice"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Payment"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Equipment"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Contract"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Message"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "NotificationRule"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "AuditLog"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER POLICY tenant_isolation ON "Photo"
  USING (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
    OR COALESCE(current_setting('app.tenant_id', true), '') = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );
