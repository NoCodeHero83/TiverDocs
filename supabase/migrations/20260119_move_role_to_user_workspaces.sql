-- Migration: Move role from usuarios to user_workspaces and store role per workspace
-- 1) Add rol column to user_workspaces if not exists
-- 2) Copy existing role from usuarios into user_workspaces for existing assignments
-- 3) If a user has no assignment for a workspace, you may want to insert default assignments (not done here)
-- 4) Remove rol column from usuarios (optional, review before running)

BEGIN;

-- 1) ensure rol column exists on user_workspaces
ALTER TABLE IF EXISTS user_workspaces
ADD COLUMN IF NOT EXISTS rol text;

-- 2) For existing user_workspaces rows, if rol is NULL, set it to the user's global rol
UPDATE user_workspaces uw
SET rol = u.rol
FROM usuarios u
WHERE uw.user_id = u.id
  AND (uw.rol IS NULL OR uw.rol = '');

-- 3) (Optional) If you want to create user_workspaces entries for users who currently have a role in usuarios
-- but no user_workspaces row for a workspace, you can run custom inserts per workspace. This migration does not
-- create new assignments automatically to avoid unexpected membership changes.

-- 4) Once you've validated that all workspace-specific roles are set and your app is using them,
-- you can drop the rol column from usuarios.
-- WARNING: Dropping a column is destructive. Backup data before running.

-- ALTER TABLE usuarios DROP COLUMN IF EXISTS rol;

COMMIT;

-- Notes:
-- - If you prefer to use an ENUM type for rol, create the enum first and alter the column type accordingly.
-- Example:
-- CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Administrador', 'Visualizador');
-- ALTER TABLE user_workspaces ALTER COLUMN rol TYPE user_role USING rol::user_role;

-- After running this migration update your backend code to read `rol` from user_workspaces instead of usuarios
-- where appropriate. Keep a backup and test in a staging environment before applying to production.
