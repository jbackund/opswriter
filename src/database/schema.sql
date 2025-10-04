-- =====================================================
-- OPSWRITER DATABASE SCHEMA
-- Complete schema for operational manual management
-- =====================================================

-- =====================================================
-- 1. ENUMS AND TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('manager', 'sysadmin');
CREATE TYPE manual_status AS ENUM ('draft', 'in_review', 'approved', 'rejected');
CREATE TYPE revision_status AS ENUM ('draft', 'in_review', 'approved', 'rejected');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE export_variant AS ENUM ('draft_watermarked', 'draft_diff', 'clean_approved');
CREATE TYPE change_type AS ENUM ('created', 'updated', 'deleted');

-- =====================================================
-- 2. USER PROFILES
-- =====================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'manager',
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- =====================================================
-- 3. MANUALS
-- =====================================================

CREATE TABLE manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organization_name TEXT NOT NULL,
  manual_code TEXT NOT NULL UNIQUE, -- e.g., "OPS-001"
  status manual_status NOT NULL DEFAULT 'draft',
  current_revision TEXT NOT NULL DEFAULT '0',
  effective_date DATE,
  review_due_date DATE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}', -- For extensible custom fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_manuals_status ON manuals(status);
CREATE INDEX idx_manuals_archived ON manuals(is_archived) WHERE is_archived = false;
CREATE INDEX idx_manuals_code ON manuals(manual_code);
CREATE INDEX idx_manuals_created_by ON manuals(created_by);
CREATE INDEX idx_manuals_org ON manuals(organization_name);

-- =====================================================
-- 4. CHAPTERS (Hierarchical Structure)
-- =====================================================

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL, -- Top-level: 0, 1, 2, etc.
  section_number INTEGER, -- For subsections
  subsection_number INTEGER, -- For sub-subsections
  clause_number INTEGER, -- For fourth-level entries
  heading TEXT NOT NULL,
  display_order INTEGER NOT NULL, -- For manual ordering within siblings
  depth INTEGER NOT NULL DEFAULT 0, -- 0=chapter, 1=section, 2=subsection, 3=clause
  page_break BOOLEAN NOT NULL DEFAULT false, -- Force page break before this chapter
  is_mandatory BOOLEAN NOT NULL DEFAULT false, -- Chapter 0 is mandatory
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Ensure chapter 0 exists for all manuals
  CONSTRAINT unique_chapter_per_manual UNIQUE(manual_id, chapter_number, section_number, subsection_number, clause_number),
  -- Depth validation
  CONSTRAINT valid_depth CHECK (depth >= 0 AND depth <= 3),
  -- Numbering logic validation
  CONSTRAINT valid_numbering CHECK (
    (depth = 0 AND section_number IS NULL AND subsection_number IS NULL AND clause_number IS NULL) OR
    (depth = 1 AND section_number IS NOT NULL AND subsection_number IS NULL AND clause_number IS NULL) OR
    (depth = 2 AND section_number IS NOT NULL AND subsection_number IS NOT NULL AND clause_number IS NULL) OR
    (depth = 3 AND section_number IS NOT NULL AND subsection_number IS NOT NULL AND clause_number IS NOT NULL)
  )
);

CREATE INDEX idx_chapters_manual ON chapters(manual_id);
CREATE INDEX idx_chapters_parent ON chapters(parent_id);
CREATE INDEX idx_chapters_display_order ON chapters(manual_id, display_order);
CREATE INDEX idx_chapters_number ON chapters(manual_id, chapter_number, section_number, subsection_number, clause_number);

-- =====================================================
-- 5. CONTENT BLOCKS
-- =====================================================

CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL DEFAULT 'text', -- text, table, image, reference
  content JSONB NOT NULL, -- Rich text content stored as JSON (TipTap format)
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_content_blocks_chapter ON content_blocks(chapter_id);
CREATE INDEX idx_content_blocks_order ON content_blocks(chapter_id, display_order);

-- =====================================================
-- 6. CHAPTER REMARKS
-- =====================================================

CREATE TABLE chapter_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  remark_text TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_chapter_remark_order UNIQUE(chapter_id, display_order)
);

CREATE INDEX idx_chapter_remarks_chapter ON chapter_remarks(chapter_id);

-- =====================================================
-- 7. REVISIONS
-- =====================================================

CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  revision_number TEXT NOT NULL, -- "0", "1", "1.1", "1.2", "2", etc.
  status revision_status NOT NULL DEFAULT 'draft',
  snapshot JSONB NOT NULL, -- Complete snapshot of manual state
  changes_summary TEXT,
  chapters_affected TEXT[], -- Array of chapter numbers affected
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  submitted_for_review_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  CONSTRAINT unique_manual_revision UNIQUE(manual_id, revision_number)
);

CREATE INDEX idx_revisions_manual ON revisions(manual_id);
CREATE INDEX idx_revisions_status ON revisions(status);
CREATE INDEX idx_revisions_number ON revisions(manual_id, revision_number);
CREATE INDEX idx_revisions_approved ON revisions(approved_at) WHERE status = 'approved';

-- =====================================================
-- 8. FIELD HISTORY (Granular Change Tracking)
-- =====================================================

CREATE TABLE field_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_type change_type NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_field_history_manual ON field_history(manual_id);
CREATE INDEX idx_field_history_revision ON field_history(revision_id);
CREATE INDEX idx_field_history_record ON field_history(table_name, record_id);
CREATE INDEX idx_field_history_changed_at ON field_history(changed_at DESC);
CREATE INDEX idx_field_history_changed_by ON field_history(changed_by);

-- =====================================================
-- 9. DEFINITIONS
-- =====================================================

CREATE TABLE definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT true, -- Global vs organization-specific
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_definitions_term ON definitions(term);
CREATE INDEX idx_definitions_global ON definitions(is_global);
CREATE INDEX idx_definitions_org ON definitions(organization_name);

-- =====================================================
-- 10. ABBREVIATIONS
-- =====================================================

CREATE TABLE abbreviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation TEXT NOT NULL UNIQUE,
  full_text TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT true,
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_abbreviations_abbr ON abbreviations(abbreviation);
CREATE INDEX idx_abbreviations_global ON abbreviations(is_global);
CREATE INDEX idx_abbreviations_org ON abbreviations(organization_name);

-- =====================================================
-- 11. MANUAL DEFINITIONS (Many-to-Many)
-- =====================================================

CREATE TABLE manual_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES definitions(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  CONSTRAINT unique_manual_definition UNIQUE(manual_id, definition_id)
);

CREATE INDEX idx_manual_definitions_manual ON manual_definitions(manual_id);
CREATE INDEX idx_manual_definitions_definition ON manual_definitions(definition_id);
CREATE INDEX idx_manual_definitions_order ON manual_definitions(manual_id, display_order);

-- =====================================================
-- 12. MANUAL ABBREVIATIONS (Many-to-Many)
-- =====================================================

CREATE TABLE manual_abbreviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  abbreviation_id UUID NOT NULL REFERENCES abbreviations(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  CONSTRAINT unique_manual_abbreviation UNIQUE(manual_id, abbreviation_id)
);

CREATE INDEX idx_manual_abbreviations_manual ON manual_abbreviations(manual_id);
CREATE INDEX idx_manual_abbreviations_abbr ON manual_abbreviations(abbreviation_id);
CREATE INDEX idx_manual_abbreviations_order ON manual_abbreviations(manual_id, display_order);

-- =====================================================
-- 13. EXPORT JOBS
-- =====================================================

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  variant export_variant NOT NULL,
  status export_status NOT NULL DEFAULT 'pending',
  file_path TEXT, -- Supabase Storage path
  file_url TEXT, -- Signed URL
  expires_at TIMESTAMPTZ, -- 30-day retention
  error_message TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_export_jobs_manual ON export_jobs(manual_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_expires ON export_jobs(expires_at);
CREATE INDEX idx_export_jobs_created_by ON export_jobs(created_by);

-- =====================================================
-- 14. AUDIT LOGS (Immutable)
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Make audit_logs immutable (no updates or deletes allowed)
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =====================================================
-- 15. TRIGGERS
-- =====================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER manuals_updated_at BEFORE UPDATE ON manuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER content_blocks_updated_at BEFORE UPDATE ON content_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chapter_remarks_updated_at BEFORE UPDATE ON chapter_remarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER revisions_updated_at BEFORE UPDATE ON revisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER definitions_updated_at BEFORE UPDATE ON definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER abbreviations_updated_at BEFORE UPDATE ON abbreviations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging trigger function
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

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
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

-- Apply audit triggers to key tables
CREATE TRIGGER audit_manuals AFTER INSERT OR UPDATE OR DELETE ON manuals FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_chapters AFTER INSERT OR UPDATE OR DELETE ON chapters FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_content_blocks AFTER INSERT OR UPDATE OR DELETE ON content_blocks FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_revisions AFTER INSERT OR UPDATE OR DELETE ON revisions FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_user_profiles AFTER INSERT OR UPDATE OR DELETE ON user_profiles FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Field-level change tracking trigger
CREATE OR REPLACE FUNCTION track_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  manual_id_val UUID;
  revision_id_val UUID;
  field_name_val TEXT;
  old_val JSONB;
  new_val JSONB;
BEGIN
  -- Determine manual_id based on table
  IF TG_TABLE_NAME = 'manuals' THEN
    manual_id_val := NEW.id;
  ELSIF TG_TABLE_NAME = 'chapters' THEN
    manual_id_val := NEW.manual_id;
  ELSIF TG_TABLE_NAME = 'content_blocks' THEN
    SELECT c.manual_id INTO manual_id_val FROM chapters c WHERE c.id = NEW.chapter_id;
  END IF;

  -- Track changes for each modified field
  FOR field_name_val IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    old_val := to_jsonb(OLD) -> field_name_val;
    new_val := to_jsonb(NEW) -> field_name_val;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO field_history (
        manual_id,
        table_name,
        record_id,
        field_name,
        old_value,
        new_value,
        change_type,
        changed_by
      ) VALUES (
        manual_id_val,
        TG_TABLE_NAME,
        NEW.id,
        field_name_val,
        old_val,
        new_val,
        'updated'::change_type,
        auth.uid()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply field tracking to content tables
CREATE TRIGGER track_manual_changes AFTER UPDATE ON manuals FOR EACH ROW EXECUTE FUNCTION track_field_changes();
CREATE TRIGGER track_chapter_changes AFTER UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION track_field_changes();
CREATE TRIGGER track_content_changes AFTER UPDATE ON content_blocks FOR EACH ROW EXECUTE FUNCTION track_field_changes();

-- =====================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE abbreviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_abbreviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is sysadmin
CREATE OR REPLACE FUNCTION is_sysadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'sysadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USER PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "SysAdmins can view all profiles" ON user_profiles FOR SELECT USING (is_sysadmin());
CREATE POLICY "SysAdmins can insert profiles" ON user_profiles FOR INSERT WITH CHECK (is_sysadmin());
CREATE POLICY "SysAdmins can update all profiles" ON user_profiles FOR UPDATE USING (is_sysadmin());
CREATE POLICY "SysAdmins can delete profiles" ON user_profiles FOR DELETE USING (is_sysadmin());

-- MANUALS POLICIES
CREATE POLICY "Authenticated users can view manuals" ON manuals FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create manuals" ON manuals FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update manuals" ON manuals FOR UPDATE USING (is_authenticated());
CREATE POLICY "SysAdmins can delete manuals" ON manuals FOR DELETE USING (is_sysadmin());

-- CHAPTERS POLICIES
CREATE POLICY "Authenticated users can view chapters" ON chapters FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create chapters" ON chapters FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update chapters" ON chapters FOR UPDATE USING (is_authenticated());
CREATE POLICY "Managers can delete chapters" ON chapters FOR DELETE USING (is_authenticated());

-- CONTENT BLOCKS POLICIES
CREATE POLICY "Authenticated users can view content" ON content_blocks FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create content" ON content_blocks FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update content" ON content_blocks FOR UPDATE USING (is_authenticated());
CREATE POLICY "Managers can delete content" ON content_blocks FOR DELETE USING (is_authenticated());

-- CHAPTER REMARKS POLICIES
CREATE POLICY "Authenticated users can view remarks" ON chapter_remarks FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create remarks" ON chapter_remarks FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update remarks" ON chapter_remarks FOR UPDATE USING (is_authenticated());
CREATE POLICY "Managers can delete remarks" ON chapter_remarks FOR DELETE USING (is_authenticated());

-- REVISIONS POLICIES
CREATE POLICY "Authenticated users can view revisions" ON revisions FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create revisions" ON revisions FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update revisions" ON revisions FOR UPDATE USING (is_authenticated());
CREATE POLICY "SysAdmins can delete revisions" ON revisions FOR DELETE USING (is_sysadmin());

-- FIELD HISTORY POLICIES (Read-only for all authenticated users)
CREATE POLICY "Authenticated users can view field history" ON field_history FOR SELECT USING (is_authenticated());

-- DEFINITIONS POLICIES
CREATE POLICY "Authenticated users can view definitions" ON definitions FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create definitions" ON definitions FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update definitions" ON definitions FOR UPDATE USING (is_authenticated());
CREATE POLICY "SysAdmins can delete definitions" ON definitions FOR DELETE USING (is_sysadmin());

-- ABBREVIATIONS POLICIES
CREATE POLICY "Authenticated users can view abbreviations" ON abbreviations FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can create abbreviations" ON abbreviations FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Managers can update abbreviations" ON abbreviations FOR UPDATE USING (is_authenticated());
CREATE POLICY "SysAdmins can delete abbreviations" ON abbreviations FOR DELETE USING (is_sysadmin());

-- MANUAL DEFINITIONS POLICIES
CREATE POLICY "Authenticated users can view manual definitions" ON manual_definitions FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can manage manual definitions" ON manual_definitions FOR ALL USING (is_authenticated());

-- MANUAL ABBREVIATIONS POLICIES
CREATE POLICY "Authenticated users can view manual abbreviations" ON manual_abbreviations FOR SELECT USING (is_authenticated());
CREATE POLICY "Managers can manage manual abbreviations" ON manual_abbreviations FOR ALL USING (is_authenticated());

-- EXPORT JOBS POLICIES
CREATE POLICY "Users can view own export jobs" ON export_jobs FOR SELECT USING (created_by = auth.uid() OR is_sysadmin());
CREATE POLICY "Managers can create export jobs" ON export_jobs FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Users can update own export jobs" ON export_jobs FOR UPDATE USING (created_by = auth.uid() OR is_sysadmin());

-- AUDIT LOGS POLICIES (Read-only)
CREATE POLICY "SysAdmins can view all audit logs" ON audit_logs FOR SELECT USING (is_sysadmin());
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 17. FUNCTIONS AND UTILITIES
-- =====================================================

-- Function to get next revision number
CREATE OR REPLACE FUNCTION get_next_revision_number(p_manual_id UUID, p_is_draft BOOLEAN DEFAULT true)
RETURNS TEXT AS $$
DECLARE
  highest_base INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN revision_number ~ '^[0-9]+$' THEN revision_number::INTEGER
        WHEN revision_number ~ '^[0-9]+\.[0-9]+$' THEN SPLIT_PART(revision_number, '.', 1)::INTEGER
        ELSE NULL
      END
    ),
    0
  )
  INTO highest_base
  FROM revisions
  WHERE manual_id = p_manual_id;

  IF p_is_draft THEN
    RETURN (highest_base + 1)::TEXT;
  END IF;

  RETURN highest_base::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate chapter 0 for new manuals
CREATE OR REPLACE FUNCTION ensure_chapter_zero()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert mandatory Chapter 0
  INSERT INTO chapters (
    manual_id,
    chapter_number,
    heading,
    display_order,
    depth,
    is_mandatory,
    created_by
  ) VALUES (
    NEW.id,
    0,
    'Frontmatter',
    0,
    0,
    true,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_chapter_zero_trigger
  AFTER INSERT ON manuals
  FOR EACH ROW
  EXECUTE FUNCTION ensure_chapter_zero();

-- Function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete export jobs older than 30 days
  WITH deleted AS (
    DELETE FROM export_jobs
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 18. INITIAL DATA
-- =====================================================

-- Insert global definitions (examples) - will fail if no user exists yet
-- INSERT INTO definitions (term, definition, is_global, created_by) VALUES
--   ('Manual', 'A comprehensive document containing procedures, guidelines, and policies.', true, (SELECT id FROM auth.users LIMIT 1)),
--   ('Revision', 'A version of a document that has been reviewed and approved.', true, (SELECT id FROM auth.users LIMIT 1)),
--   ('Chapter', 'A major section within a manual covering a specific topic.', true, (SELECT id FROM auth.users LIMIT 1))
-- ON CONFLICT (term) DO NOTHING;

-- Insert global abbreviations (examples) - will fail if no user exists yet
-- INSERT INTO abbreviations (abbreviation, full_text, is_global, created_by) VALUES
--   ('RLS', 'Row Level Security', true, (SELECT id FROM auth.users LIMIT 1)),
--   ('PDF', 'Portable Document Format', true, (SELECT id FROM auth.users LIMIT 1)),
--   ('TOC', 'Table of Contents', true, (SELECT id FROM auth.users LIMIT 1))
-- ON CONFLICT (abbreviation) DO NOTHING;

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================

-- Verify schema
SELECT
  'Schema created successfully. Total tables: ' || COUNT(*)::TEXT AS status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
