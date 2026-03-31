-- Migration: Create subscription_assignments table
-- Maps subscriptions to users (many-to-many) and stores assignment status and timestamps

BEGIN;

CREATE TABLE IF NOT EXISTS subscription_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  status text DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  accepted_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_subscription_assignments_subscription_id ON subscription_assignments (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_assignments_user_id ON subscription_assignments (user_id);

COMMIT;

-- Example insert:
-- INSERT INTO subscription_assignments (subscription_id, user_id, status) VALUES ('SUB_ID','USER_ID','assigned');

-- Query to list assigned users for a subscription:
-- SELECT sa.*, u.full_name, u.email
-- FROM subscription_assignments sa
-- JOIN usuarios u ON u.id = sa.user_id
-- WHERE sa.subscription_id = 'SUB_ID';
