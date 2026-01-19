-- Migration: Create subscriptions table
-- Stores subscriptions per workspace with responsible user and date range

BEGIN;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  responsible_user_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_responsible_user_id ON subscriptions(responsible_user_id);

COMMIT;

-- Usage examples:
-- Insert:
-- INSERT INTO subscriptions (workspace_id, responsible_user_id, start_date, end_date, notes)
-- VALUES ('WORKSPACE_ID', 'USER_ID', '2026-01-01', '2026-12-31', 'Plan anual');

-- Query join:
-- SELECT s.*, w.name as workspace_name, u.full_name as responsible_name, u.email as responsible_email
-- FROM subscriptions s
-- JOIN workspaces w ON w.id = s.workspace_id
-- LEFT JOIN usuarios u ON u.id = s.responsible_user_id
-- WHERE s.workspace_id = 'WORKSPACE_ID';
