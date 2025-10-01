-- Run this query after applying the schema to verify everything was created successfully

SELECT
  'Tables: ' || COUNT(*)::TEXT AS status,
  array_agg(tablename ORDER BY tablename) AS table_list
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename != 'schema_migrations'
GROUP BY 1

UNION ALL

SELECT
  'Enums: ' || COUNT(*)::TEXT AS status,
  array_agg(typname ORDER BY typname) AS enum_list
FROM pg_type
WHERE typtype = 'e'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY 1

UNION ALL

SELECT
  'Indexes: ' || COUNT(*)::TEXT AS status,
  NULL AS details
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'

UNION ALL

SELECT
  'Triggers: ' || COUNT(*)::TEXT AS status,
  NULL AS details
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Expected results:
-- Tables: 14 (user_profiles, manuals, chapters, content_blocks, chapter_remarks,
--            revisions, field_history, definitions, abbreviations,
--            manual_definitions, manual_abbreviations, export_jobs, audit_logs)
-- Enums: 6 (user_role, manual_status, revision_status, export_status,
--          export_variant, change_type)
-- Indexes: 40+
-- Triggers: 10+