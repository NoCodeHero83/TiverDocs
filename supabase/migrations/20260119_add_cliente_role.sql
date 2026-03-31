-- Migration: add 'Cliente' value to user_role enum
-- Adds the 'Cliente' role so invites can be assigned with rol = 'Cliente'

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'Cliente'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'Cliente';
  END IF;
END$$;

COMMIT;
