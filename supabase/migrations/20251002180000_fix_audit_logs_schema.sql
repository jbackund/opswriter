-- =====================================================
-- Fix audit_logs table schema to match application code
-- =====================================================

-- Add actor_email column (denormalized for immutability)
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS actor_email TEXT;

-- Rename user_id to actor_id for semantic clarity
ALTER TABLE audit_logs
RENAME COLUMN user_id TO actor_id;

-- Rename details to metadata for consistency
ALTER TABLE audit_logs
RENAME COLUMN details TO metadata;

-- Update the foreign key constraint name to match new column
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update index names to match new column names
DROP INDEX IF EXISTS idx_audit_logs_user;
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- Update RLS policies to use new column name
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "SysAdmins can view all audit logs" ON audit_logs;

CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (actor_id = auth.uid());

CREATE POLICY "SysAdmins can view all audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'sysadmin'
  )
);

-- Update the audit logging trigger function to use new column names
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add user_id column for joining with user_profiles table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint to user_profiles
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Create index for join performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Backfill user_id from actor_id by matching with user_profiles
-- This assumes user_profiles.id matches auth.users.id (which it does based on the FK)
UPDATE audit_logs
SET user_id = actor_id
WHERE actor_id IS NOT NULL AND user_id IS NULL;

-- Add comments explaining the schema
COMMENT ON COLUMN audit_logs.actor_id IS 'References auth.users.id - the authenticated user who performed the action';
COMMENT ON COLUMN audit_logs.user_id IS 'References user_profiles.id - for joining with user profile information. Same as actor_id but allows direct joins with user_profiles table.';
COMMENT ON COLUMN audit_logs.actor_email IS 'Denormalized email for audit trail immutability, even if user is deleted';
COMMENT ON COLUMN audit_logs.metadata IS 'Flexible JSONB field for action-specific context and details';
