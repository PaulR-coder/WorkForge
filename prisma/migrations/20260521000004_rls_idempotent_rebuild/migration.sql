-- Idempotent RLS rebuild.
--
-- Fully safe to run in any DB state:
--   • fresh DB (no RLS yet)
--   • 000002 applied but not 000003 (buggy = '' policy)
--   • 000002 + 000003 applied (COALESCE policy — this is a no-op update)
--   • migrations table says 000003 failed (Prisma will retry 000004 instead)
--
-- Uses DROP POLICY IF EXISTS + CREATE POLICY so there is no dependency on
-- the previous policy existing.  ENABLE/FORCE ROW LEVEL SECURITY are
-- idempotent DDL — safe to run even when already enabled.
--
-- Policy logic (three pass-through conditions):
--   1. app.is_superadmin = 'true'  → cross-tenant superadmin access
--   2. COALESCE(app.tenant_id,'') = ''  → unset GUC (pre-auth routes,
--      startup migrations, cron jobs) — passes through so app-level
--      filtering still applies
--   3. tenantId = app.tenant_id  → strict per-tenant isolation

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'User','Invite','Job','Invoice','Payment',
    'Equipment','Contract','Message','NotificationRule','AuditLog','Photo'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    -- Drop old policy regardless of whether it exists
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);

    -- Re-create with COALESCE fix
    EXECUTE format($$
      CREATE POLICY tenant_isolation ON %I
        AS PERMISSIVE FOR ALL
        USING (
          COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
          OR COALESCE(current_setting('app.tenant_id', true), '') = ''
          OR "tenantId" = current_setting('app.tenant_id', true)
        )
        WITH CHECK (
          COALESCE(current_setting('app.is_superadmin', true), '') = 'true'
          OR COALESCE(current_setting('app.tenant_id', true), '') = ''
          OR "tenantId" = current_setting('app.tenant_id', true)
        )
    $$, t);
  END LOOP;
END $$;
