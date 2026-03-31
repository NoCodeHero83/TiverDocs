-- Migration: Add workspace-scoped role/state and invitation fields to user_workspaces
-- Adds ENUM types, new columns, copies existing roles from usuarios, and creates useful indexes.
-- Review and test in staging before applying to production.

BEGIN;

-- 1) Create enums for role and membership state if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Administrador', 'Visualizador');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_state') THEN
    CREATE TYPE membership_state AS ENUM ('Invitado', 'Aceptado', 'Activo', 'Inactivo');
  END IF;
END$$;

-- 2) Add columns to user_workspaces
ALTER TABLE IF EXISTS user_workspaces
  ADD COLUMN IF NOT EXISTS rol user_role,
  ADD COLUMN IF NOT EXISTS estado membership_state,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS invitation_token text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid;

-- 3) Copy existing rol from usuarios into user_workspaces where missing
-- Note: assumes usuarios.rol contains compatible values ('SuperAdmin','Administrador','Visualizador')
UPDATE user_workspaces uw
SET rol = u.rol::user_role
FROM usuarios u
WHERE uw.user_id = u.id
  AND (uw.rol IS NULL);

-- 4) If estado is NULL set a sensible default for existing assignments
UPDATE user_workspaces
SET estado = 'Activo'
WHERE estado IS NULL;

-- 5) Create indexes to accelerate lookups per workspace
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces (workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces (user_id);

COMMIT;

-- ROLLBACK notes:
-- To revert, DROP the added columns and types (destructive) after ensuring no code depends on them.
-- Example revert commands (use with caution):
-- ALTER TABLE user_workspaces DROP COLUMN IF EXISTS invitation_token, DROP COLUMN IF EXISTS invited_at, DROP COLUMN IF EXISTS invited_by, DROP COLUMN IF EXISTS accepted_at, DROP COLUMN IF EXISTS accepted_by, DROP COLUMN IF EXISTS estado, DROP COLUMN IF EXISTS rol;
-- DROP TYPE IF EXISTS membership_state;
-- DROP TYPE IF EXISTS user_role;

-- After running this migration:
-- - Update application logic to read/set `rol` and `estado` from `user_workspaces` (per workspace), not from `usuarios`.
-- - If you want to remove `rol` from `usuarios`, create a separate migration to drop that column after verifying all assignments were migrated.
-- - Consider adding a lightweight `invitations` table if you need to track invitation lifecycle separately from membership.
