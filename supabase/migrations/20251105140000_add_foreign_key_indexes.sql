-- Migration: 20251105140000_add_foreign_key_indexes.sql
-- Purpose: Add covering indexes for foreign keys flagged by Supabase advisor

-- Abbreviations FK indexes
CREATE INDEX IF NOT EXISTS idx_abbreviations_created_by ON abbreviations(created_by);
CREATE INDEX IF NOT EXISTS idx_abbreviations_updated_by ON abbreviations(updated_by);

-- Chapter remarks FK indexes
CREATE INDEX IF NOT EXISTS idx_chapter_remarks_created_by ON chapter_remarks(created_by);
CREATE INDEX IF NOT EXISTS idx_chapter_remarks_updated_by ON chapter_remarks(updated_by);

-- Chapters FK indexes
CREATE INDEX IF NOT EXISTS idx_chapters_created_by ON chapters(created_by);
CREATE INDEX IF NOT EXISTS idx_chapters_updated_by ON chapters(updated_by);

-- Content blocks FK indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_created_by ON content_blocks(created_by);
CREATE INDEX IF NOT EXISTS idx_content_blocks_updated_by ON content_blocks(updated_by);

-- Definitions FK indexes
CREATE INDEX IF NOT EXISTS idx_definitions_created_by ON definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_definitions_updated_by ON definitions(updated_by);

-- Export jobs FK index
CREATE INDEX IF NOT EXISTS idx_export_jobs_revision ON export_jobs(revision_id);

-- Manual abbreviations FK index
CREATE INDEX IF NOT EXISTS idx_manual_abbreviations_created_by ON manual_abbreviations(created_by);

-- Manual definitions FK index
CREATE INDEX IF NOT EXISTS idx_manual_definitions_created_by ON manual_definitions(created_by);

-- Manuals FK index
CREATE INDEX IF NOT EXISTS idx_manuals_updated_by ON manuals(updated_by);

-- Revisions FK indexes
CREATE INDEX IF NOT EXISTS idx_revisions_approved_by ON revisions(approved_by);
CREATE INDEX IF NOT EXISTS idx_revisions_rejected_by ON revisions(rejected_by);
CREATE INDEX IF NOT EXISTS idx_revisions_submitted_by ON revisions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_revisions_created_by ON revisions(created_by);

-- User profiles FK indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_by ON user_profiles(updated_by);
