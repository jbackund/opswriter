-- Migration: 20251105131500_optimize_rls_policies.sql
-- Purpose: Address Supabase advisor warnings by optimizing RLS policies and removing duplicate indexes

-- =============================
-- User profile policies
-- =============================
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "SysAdmins can view all profiles" ON user_profiles;
CREATE POLICY "View profiles (self or sysadmin)" ON user_profiles
FOR SELECT
USING (
  is_sysadmin() OR id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "SysAdmins can update all profiles" ON user_profiles;
CREATE POLICY "Update profiles (self or sysadmin)" ON user_profiles
FOR UPDATE
USING (
  is_sysadmin() OR id = (SELECT auth.uid())
)
WITH CHECK (
  is_sysadmin() OR id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own profile or SysAdmins can insert any" ON user_profiles;
CREATE POLICY "Insert profiles (self or sysadmin)" ON user_profiles
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = id OR is_sysadmin()
);

-- =============================
-- Export job policies
-- =============================
DROP POLICY IF EXISTS "Users can view own export jobs" ON export_jobs;
CREATE POLICY "View export jobs (owner or sysadmin)" ON export_jobs
FOR SELECT
USING (
  is_sysadmin() OR created_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can update own export jobs" ON export_jobs;
CREATE POLICY "Update export jobs (owner or sysadmin)" ON export_jobs
FOR UPDATE
USING (
  is_sysadmin() OR created_by = (SELECT auth.uid())
)
WITH CHECK (
  is_sysadmin() OR created_by = (SELECT auth.uid())
);

-- =============================
-- Audit log policies
-- =============================
DROP POLICY IF EXISTS "SysAdmins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "View audit logs (self or sysadmin)" ON audit_logs
FOR SELECT
USING (
  is_sysadmin() OR user_id = (SELECT auth.uid())
);

-- =============================
-- Organization settings policies
-- =============================
DROP POLICY IF EXISTS "Only SysAdmins can insert organization settings" ON organization_settings;
CREATE POLICY "Only SysAdmins can insert organization settings" ON organization_settings
FOR INSERT
TO authenticated
WITH CHECK (is_sysadmin());

DROP POLICY IF EXISTS "Only SysAdmins can update organization settings" ON organization_settings;
CREATE POLICY "Only SysAdmins can update organization settings" ON organization_settings
FOR UPDATE
TO authenticated
USING (is_sysadmin())
WITH CHECK (is_sysadmin());

-- =============================
-- Reference category policies
-- =============================
DROP POLICY IF EXISTS "Only SysAdmins can insert reference categories" ON reference_categories;
CREATE POLICY "Only SysAdmins can insert reference categories" ON reference_categories
FOR INSERT
TO authenticated
WITH CHECK (is_sysadmin());

DROP POLICY IF EXISTS "Only SysAdmins can update reference categories" ON reference_categories;
CREATE POLICY "Only SysAdmins can update reference categories" ON reference_categories
FOR UPDATE
TO authenticated
USING (is_sysadmin())
WITH CHECK (is_sysadmin());

DROP POLICY IF EXISTS "Only SysAdmins can delete reference categories" ON reference_categories;
CREATE POLICY "Only SysAdmins can delete reference categories" ON reference_categories
FOR DELETE
TO authenticated
USING (is_sysadmin());

-- =============================
-- Manual definition policies
-- =============================
DROP POLICY IF EXISTS "Managers can manage manual definitions" ON manual_definitions;
CREATE POLICY "Manual definitions insert (authenticated)" ON manual_definitions
FOR INSERT
WITH CHECK (is_authenticated());

CREATE POLICY "Manual definitions update (authenticated)" ON manual_definitions
FOR UPDATE
USING (is_authenticated())
WITH CHECK (is_authenticated());

CREATE POLICY "Manual definitions delete (authenticated)" ON manual_definitions
FOR DELETE
USING (is_authenticated());

-- =============================
-- Manual abbreviation policies
-- =============================
DROP POLICY IF EXISTS "Managers can manage manual abbreviations" ON manual_abbreviations;
CREATE POLICY "Manual abbreviations insert (authenticated)" ON manual_abbreviations
FOR INSERT
WITH CHECK (is_authenticated());

CREATE POLICY "Manual abbreviations update (authenticated)" ON manual_abbreviations
FOR UPDATE
USING (is_authenticated())
WITH CHECK (is_authenticated());

CREATE POLICY "Manual abbreviations delete (authenticated)" ON manual_abbreviations
FOR DELETE
USING (is_authenticated());

-- =============================
-- Index cleanup
-- =============================
DROP INDEX IF EXISTS idx_content_blocks_chapter;
DROP INDEX IF EXISTS idx_content_blocks_order;
