# OpsWriter TODO

## 1. Foundation & Environment
- [x] Scaffold Next.js (React/TypeScript) app with Tailwind on Vercel
- [x] Provision Supabase project (PostgreSQL, storage, auth) and set environment variables in Vercel
- [x] Install and configure `puppeteer-core` + `@sparticuz/chromium` for serverless PDF rendering
- [x] Integrate Resend SDK and configure sender domain
- [x] Establish shared UI component library and base layout (DocGen-inspired navigation)
- [x] Define environment-specific config (development, preview, production)

## 2. Authentication & User Roles
- [x] Implement Supabase email/password auth flows (login, logout, session refresh)
- [x] Enforce domain restriction - only allow email addresses with @heliairsweden.com domain
- [x] Build onboarding flow for SysAdmin to invite/deactivate users
- [x] Create SysAdmin-only user management screen; ensure Managers inherit all content permissions
- [x] Add password policy enforcement and inactivity timeout handling

## 3. Database Schema & Migrations
- [x] Design Supabase tables: manuals, chapters, content_blocks, revisions, field_history, exports, definitions, abbreviations, manual_definition, manual_abbreviation, audit_logs, users metadata
- [x] Implement triggers/functions for revision history and audit entries
- [x] Apply database schema via Supabase CLI
- [x] Generate TypeScript types from database schema
- [x] Add storage buckets for attachments and logos with security rules

## 4. Manual Dashboard
- [x] Build manuals list view with columns (name, revision, effective date, status, version, owner)
- [x] Implement search, filtering (status, owner, tags), and sorting
- [x] Add action buttons (`Send in review`, `Create draft`, `Approved`, `Rejected`, export) styled per reference UI
- [x] Surface global metrics widget (manuals awaiting review)

## 5. Manual Creation & Metadata
- [x] Create manual metadata form (title, description, organization, language, owner, tags, status, effective date, reference number, document code, cover logo)
- [x] Add clone-manual capability (structure only)
- [x] Validate Chapter 0 requirement on new manuals

## 6. Manual Structure & Editor
- [x] Build navigation tree with chapters/subchapters and reference links
- [x] Implement add/remove with auto-renumbering
- [x] Implement reorder with undo functionality
- [x] Add page-break toggle, remark field, and metadata per chapter
- [x] Integrate rich text editor (Word-like toolbar, formatting, tables, images, attachments)
- [x] Support autosave, discard changes, inline references, cross-links

## 7. Revision Management & Audit Trail
- [x] Persist per-field revision history and change metadata
- [x] Display history tab with diff viewer (including page-break toggle changes)
- [x] Implement rollback mechanism for manual or chapter level
- [x] Set revision numbering scheme (start at 0; draft decimals until approval)
- [x] Log all CRUD operations to audit trail with actor, timestamps, before/after snapshots

## 8. Review Workflow
- [x] Implement `Send in review` action generating immutable snapshot and freezing edits
- [x] Build approval screen for authority decision (accept/reject with comment)
- [x] Handle rejection path reverting to draft; acceptance path prompting for effective date and auto-incrementing revision
- [x] Restrict editing when status is `in review` or `approved`

## 9. Exporting & PDFs
- [x] Build PDF generation pipeline (cover page, headers, footers, table of contents)
- [x] Assemble required sections: Record of Revision, Chapters Affected, List of Abbreviations, List of Definitions, Change Log Appendix
- [x] Implement draft export variants: watermarked, diff (red strikethrough removals, green additions)
- [x] Ensure approved exports are clean; in-review exports read-only snapshot
- [x] Respect chapter page-break toggle and chapter remarks in PDF tables
- [x] Cache and store exports with 30-day retention and access control

## 10. Reference Management
- [ ] Create sidebar reference pages for definitions and abbreviations CRUD
- [ ] Implement manual-level selection UI for which references to include
- [ ] Update exports to surface selected references only
- [ ] Add search filters for references and inclusion status

## 11. Notifications & Activity
- [ ] Wire Resend emails for review requests, approvals, rejections, manual assignments
- [ ] Build activity feed per manual summarizing recent changes

## 12. Search & Discovery
- [ ] Implement global search across manuals, chapters, definitions, abbreviations with filters
- [ ] Add in-manual search with highlighted results

## 13. Administration & Settings
- [ ] Provide SysAdmin console for user invitations, deactivation, and role toggles
- [ ] Build organization settings (branding, export footer text, reference categories)
- [ ] Deliver audit log reporting with advanced filters and CSV export

## 14. Analytics & Reporting
- [ ] Instrument key funnels (login success, manual creation, export completion)
- [ ] Track editor actions (revision saves, change summaries, rollbacks)
- [ ] Capture review workflow KPIs (time in review, approval rate, rejection reasons)

## 15. Infrastructure & Operations
- [ ] Configure background job strategy (Supabase Functions or external queue) for heavy PDF tasks
- [ ] Set up automated backups and retention policies in Supabase (indefinite revision history)
- [ ] Establish monitoring/alerting (Supabase logs, Vercel analytics, email delivery status)

## 16. QA & Compliance
- [ ] Develop test plan covering unit, integration, end-to-end (critical flows: editing, review, exports)
- [ ] Generate sample data/manuals for UAT and PDF baseline comparisons
- [ ] Perform accessibility audit (WCAG 2.1 AA) on dashboard, editor, exports selection
- [ ] Validate security controls (role enforcement, audit log immutability, storage permissions)

## 17. Documentation & Launch Prep
- [ ] Document user guides (manual creation, review workflow, exporting)
- [ ] Author admin handbook (user management, audit reporting)
- [ ] Create operational runbooks (deployments, incident response, export troubleshooting)
- [ ] Plan beta onboarding and GA launch checklist
