-- Migration: 20251105120000_set_function_search_path.sql
-- Purpose: Set explicit search_path for functions flagged by Supabase security advisor

-- Audit logging functions
ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.track_field_changes() SET search_path = public;

-- Timestamp maintenance helpers
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_organization_settings_updated_at() SET search_path = public;

-- Authorization helpers
ALTER FUNCTION public.is_sysadmin() SET search_path = public;
ALTER FUNCTION public.is_authenticated() SET search_path = public;

-- Revision utilities
ALTER FUNCTION public.get_next_revision_number(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.ensure_chapter_zero() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_exports() SET search_path = public;
