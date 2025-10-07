# OpsWriter Product Requirements Document (PRD)

## 1. Product Summary
- **Product name**: OpsWriter
- **Document owner**: Product Management (Joel Backlund)
- **Stakeholders**: Engineering, Design, QA, Customer Success, Compliance
- **Target release**: Q1 2025 (MVP)

### 1.1 Vision
Provide regulated operations teams with a single place to author, review, and distribute operational manuals with full revision traceability and export-ready output.

### 1.2 Problem Statement
Regulated organizations need to produce and maintain operations manuals that undergo frequent updates and audits. Existing tooling is fragmented: version control is manual, exports require extra tooling, and authentication is inconsistent. OpsWriter solves this by delivering authenticated access, structured manual editing, and robust revision tracking in one platform.

### 1.3 Goals & Success Metrics
- **G1**: Enable authenticated users to create, edit, and manage manuals with structured chapters and content blocks.
- **G2**: Provide end-to-end revision tracking with field-level history for chapters and headings.
- **G3**: Offer export capabilities that regulators accept (PDF-only distribution).
- **G4**: Deliver administrator visibility via a dashboard showing all manuals and their version status.

**Metrics**
- 100% of manual edits are persisted with revision metadata (manual, chapter, field level).
- 95% of exports succeed on first attempt (no validation errors) during beta.
- Median time from login to opening a manual < 3 seconds for 90% of sessions.
- <2% authentication-related support tickets in first three months post-launch.

## 2. Background & Strategic Fit
OpsWriter extends the OpsSuite product family to cover manual authoring. It complements existing compliance and inspection tools by addressing documentation management. The UI concepts reference DocGen-like structured editing (see attached screenshots) to align with user expectations.

## 3. Personas & Primary Users
- **Compliance Manager (Primary)**: Owns manual content, needs revision traceability and export for regulators.
- **Training/Operations Manager (Secondary)**: Consumes manuals, suggests updates, and tracks current version.
- **Auditor/Inspector (Tertiary)**: Requires read-only access to latest approved manual and revision history.

## 4. User Journeys
1. **Login & Dashboard Overview**: User authenticates and lands on dashboard listing manuals with key metadata (version, status, last updated, owner). They can search/filter and open a manual.
2. **Create New Manual**: User selects “Create manual,” enters metadata, defines initial chapters/headers, adds content, saves draft, and sees it listed on dashboard.
3. **Edit Existing Manual**: User opens manual, adds or modifies chapters and content blocks. System automatically creates new revision, logs change history, and allows comparison with prior versions.
4. **Export Manual**: User chooses export format (PDF MVP). System generates file, attaches revision info, and makes it downloadable or shareable.
5. **Review Revision History**: User opens history view to inspect previous versions per chapter or field and can restore or fork from a selected revision.

## 5. Scope
### 5.1 In Scope (MVP)
- Authenticated web experience (email/password).
- Manual dashboard with list, search, filters, and sidebar navigation exposing References (Definitions, Abbreviations).
- Manual creation/editing with structured chapter hierarchy (chapters, sections, sub-sections).
- Field-level storage for each chapter title and content block.
- Revision history at manual, chapter, and field level with diff visualization.
- Manual-level metadata management (status, effective date, owners, reference number, document code, cover branding).
- Status-aware PDF exports: draft revisions produce DRAFT-watermarked and diff-highlighted copies; approved manuals export clean copies with optional version stamp.
- PDF exports automatically assemble Record of Revision, Chapters Affected, List of Abbreviations, List of Definitions, and Table of Contents sections.
- Reference management pages for Definitions and Abbreviations accessible via sidebar, with manual-level selection controls.
- Comprehensive audit logging of all user CRUD actions with timestamps and contextual metadata.
- Basic commenting on revisions (single-thread notes).
- Manager role for manual edits plus SysAdmin for user provisioning (no manual-level ACLs).

### 5.2 Out of Scope (MVP)
- Real-time collaborative editing.
- Automated regulator submissions.
- Localization/internationalization.
- Mobile native apps.
- Offline editing.
- Automated policy validation rules.

## 6. Functional Requirements
### 6.1 Authentication & Authorization
- Users must authenticate via secure login (email/password). Password rules align with corporate policy (min length 12, complexity).
- Access restricted to email addresses with @heliairsweden.com domain only. Authentication attempts from other domains must be rejected.
- Support roles: `Manager` (full manual CRUD) and `SysAdmin` (manages users, inherits all Manager capabilities).
- Sessions expire after 120 minutes of inactivity; re-authentication required.
- Audit logs capture login attempts and manual access events.

### 6.2 Dashboard
- Display list of manuals with columns: Name, Revision number, Effective date, Status (draft/in review/approved), Version, Last Updated, Owner.
- Provide search and filters (status, owner, tags).
- Display status/compliance badges and action buttons styled per DocGen reference (e.g., green `Send in review`, orange `Create draft`, blue `Approved`, red `Rejected`).
- Include quick actions per manual: open, edit, export, send for review (available to all authenticated users).
- Present global CTA “Create Manual”.

### 6.3 Manual Creation & Metadata
- `Create Manual` form captures: title (unique), description, organization, general language, owner, tags, status, effective date, reference number, document code, cover logo.
- Upon creation, manual enters `draft` status with revision `1.0` and is visible on dashboard.
- Validation enforces every manual begins with Chapter 0 before subsequent numbering.

### 6.4 Manual Structure Management
- Provide left-hand navigation tree showing manuals, chapters, and reference links (Definitions, Abbreviations).
- Support hierarchy depth of at least three levels (Chapter -> Section -> Subsection) with unlimited subchapter creation within that depth.
- Enable add/remove actions for chapters and subchapters directly from the navigation, with undo support, including toggle to force chapter to start on new export page.
- Chapter numbering auto-generates based on hierarchy (e.g., 2.1.4) and reflows when nodes are added, removed, or reordered.
- Allow reorder via drag-and-drop or numbered list controls.
- Each chapter and subchapter exposes editable header, remark, and content areas plus a `page_break` toggle stored as distinct database fields (unique ID) to support granular revision tracking.
- Validation prevents duplicate chapter numbering within same parent.

### 6.5 Content Editing
- Rich text editor per content and remark field offering Word-like toolbar controls: font family, size, text/background color, alignment, lists, styles, tables, and inline media.
- Support insertion of images (upload + alt text) and tables with merge/split cells; maintain responsive layout guidelines.
- Enable block quotes, callouts, code snippets, and reference placeholders.
- Autosave drafts every 30 seconds and on blur.
- Users can add inline references, cross-links to other chapters, select definitions/abbreviations to include, and attachments (PDF, JPG) with preview.
- Track change metadata: author, timestamp, change summary (optional note).
- Provide `discard changes` to revert unsaved edits.

### 6.6 Revision & Version Control
- Every save creates a new revision entry for manual, affected chapters, and fields.
- Field histories include previous content, author, timestamp.
- Revision numbering starts at 0 and increments automatically when a manual is approved; intermediate drafts retain decimal sub-revisions (e.g., 0.1, 0.2) until approval promotes to next integer.
- Support manual version increments (major/minor). Example: editors can promote revision 12 to version 2.1 with change log note.
- Provide history tab summarizing revisions (date, author, status, comments) and diff view showing additions/deletions at field level, including page-break toggle changes.
- Lock editing when manual is in `review` (authority pending) or `approved` status unless user has override permission.
- Allow roll-back: restore previous revision for entire manual or individual chapter.

### 6.7 Review Workflow
- Editors can submit manual for review; status set to `in review` and authority package generated (immutable snapshot).
- While `in review`, manual content is frozen; only rejection/approval actions allowed.
- Authorities (or designated approvers) can accept or reject with comment. Rejection returns manual to `draft` and unlocks editing, retaining revision history.
- Upon acceptance, manual status changes to `approved`, system prompts for new effective date, and automatically increments revision number (sequence starts at revision 0).

### 6.8 Exporting
- Export options accessible from dashboard and manual view (PDF-only).
- Distribution format: PDF with auto-generated cover page (logo, manual title, reference number, version, revision date), per-page header, footer, table of contents, metadata (version, revision, effective date); draft exports display a diagonal `DRAFT` watermark on every page.
- Export bundle injects auto-generated Record of Revision, Chapters Affected in this Revision, List of Abbreviations, and List of Definitions sections.
- Cover page reference number is sourced from manual metadata; UI must warn if missing before export.
- Each page header displays organization name, manual code, reference number, version, and effective date with section banner mirroring current chapter title.
- Each footer centers the manual code and right-aligns paginated text (`Page X / Y`).
- Manual owners can choose which shared abbreviations/definitions appear in each export (default: all selected items).
- Provide two export variants for drafts: `Draft Watermarked` (diagonal DRAFT watermark, no diff markup) and `Draft Diff` (removed text in red strikethrough, added text in green highlight). Diff compares against the previous approved or published revision.
- Approved manuals expose only clean exports without highlights or watermarks (aside from required metadata stamps).
- While a manual is `in review` with an authority, exports use the latest submitted revision and remain read-only.
- No other distribution formats beyond PDF are provided.
- Structured export tables must match reference layout: Record of Revision columns (Version, Highlights of Revision, Entered by, Responsible, Effective date); Chapters Affected columns (Chapter, Title, Remarks, Effective date) pulling remark field when present; Abbreviations/Definitions two-column list.
- Export engine honors chapter `page_break` toggle and inserts page breaks before those chapters in all variants.
- Include change log appendix for last 10 revisions.
- Exports stored for 30 days; accessible via download link with access control.
- Ensure exports reflect selected revision/version (latest by default, ability to choose historical revision).

### 6.9 Notifications & Activity (MVP light)
- Email notifications for review requests, approvals, and when manual assigned to user (delivered via Resend).
- Activity feed per manual summarizing recent edits and status changes.

### 6.10 Search & Discovery
- Global search across manual titles, chapter headers, definitions, and abbreviations with filters for manual inclusion.
- In-manual search for content across chapters with highlight.

### 6.11 Administration
- SysAdmin console to invite or deactivate users and toggle SysAdmin status; managers share all content permissions while sysadmins optionally approve manual-level inclusion requests if governance requires.
- Organization settings: branding (logo, color), default export footer text, reference categories.
- Audit log reporting (filter by user, time range, action) with export to CSV and drill-down into individual change sets.

### 6.12 Audit Logging
- Capture every create/update/delete action across manuals, chapters, content blocks, definitions, abbreviations, users, exports, and review workflow events.
- Each log entry records actor, action, entity type/id, timestamp, origin IP, and before/after snapshots (when applicable).
- Provide timeline view per manual and global log view with advanced filters (entity type, action, date range, user).
- Support export of filtered log results to CSV for regulatory submissions.
- Retain audit logs indefinitely with immutable storage guarantees.

## 7. Data Model Overview (Conceptual)
- **User**: id, name, email, is_sysadmin (bool), status, auth provider.
- **Manual**: id, title, description, organization, language, status, owner_id, version, effective_date, reference_number, document_code, cover_logo_url, created_at/updated_at, tags.
- **Definition**: id, term, description, created_by, created_at, updated_at.
- **Abbreviation**: id, short_form, meaning, created_by, created_at, updated_at.
- **ManualDefinition**: manual_id, definition_id, include (bool), created_by, updated_at.
- **ManualAbbreviation**: manual_id, abbreviation_id, include (bool), created_by, updated_at.
- **Chapter**: id, manual_id, parent_chapter_id (nullable), order_index, heading_text, numbering_label, page_break (bool), created_at, updated_at.
- **ContentBlock**: id, chapter_id, body_richtext, attachments (array), remark_richtext, created_at, updated_at.
- **Revision**: id, manual_id, version_label, revision_number, change_summary, status, created_by, created_at, submitted_at, approved_at.
- **FieldHistory**: id, entity_type (chapter heading/content), entity_id, revision_id, previous_value, new_value, metadata.
- **ExportJob**: id, manual_id, requested_by, format, source_revision_id, variant (draft_watermarked/draft_diff/approved_clean), status, download_url, expires_at.
- **AuditLog**: id, user_id, action, entity_type, entity_id, manual_id (nullable), metadata_json, origin_ip, performed_at.

## 8. Non-Functional Requirements
- **Security**: Enforce HTTPS, OWASP Top 10 mitigations, encrypted data at rest (AWS KMS). Role-based access on every API.
- **Performance**: Dashboard loads < 2 seconds with up to 500 manuals. Editor auto-save response < 300ms p95.
- **Scalability**: Support organizations with up to 5,000 chapters across manuals; design for horizontal scaling via stateless services.
- **Reliability**: 99.5% uptime SLA; nightly backups with point-in-time recovery for 30 days.
- **Compliance**: GDPR compliant data handling; audit trails immutable for regulatory review.
- **Usability**: WCAG 2.1 AA compliance for key flows (dashboard, editing, export).

## 9. Analytics & Reporting
- Track key funnels: login success, manual creation completion, export conversion.
- Instrument editor events: revision saves, change summary usage, rollbacks.
- Record review workflow KPIs: time in review, approval rate, rejection reasons.
- Provide dashboard widget for `Manuals awaiting review` count.

## 10. Technical Considerations
- Hosting on Vercel with React/TypeScript (Next.js) front-end styled via Tailwind CSS; serverless API routes connect to Supabase.
- Supabase provides PostgreSQL storage, row-level security, and object storage for attachments/exports.
- Use versioning strategy leveraging Supabase PostgreSQL features (JSONB, logical replication) or event-sourcing for field history; evaluate temporal tables.
- Background export generation runs via Supabase Functions or Vercel cron jobs; ensure long-running PDF tasks offloaded to queue/worker.
- Use `puppeteer-core` with `@sparticuz/chromium` for headless Chrome rendering compatible with Vercel serverless functions to generate PDFs.
- Resend handles transactional email delivery (review requests, approvals).

## 11. Dependencies
- Supabase project (PostgreSQL, storage, auth) provisioned with required security policies.
- Vercel environment (preview + production) with secure env var management.
- PDF rendering stack (`puppeteer-core` + `@sparticuz/chromium`) packaged with serverless functions.
- Email service Resend account for notifications.

## 12. Risks & Mitigations
- **Complex revision model**: risk of performance issues; mitigate with incremental diff storage and caching.
- **Export fidelity**: PDF rendering discrepancies; mitigate via template testing and golden file comparison.
- **User adoption**: steep learning curve; provide onboarding walkthrough and inline help.
- **Regulatory requirements change**: maintain configurable metadata fields.

## 13. Decisions
1. Export format requirements: PDF only.
2. Auditor access handled by admins generating exports (no guest accounts).
3. Templates: none required; manuals created or cloned per tenant.
4. Revision history retention: indefinite.
5. Electronic signatures: not required for MVP.

## 14. Appendix
- Reference UI inspiration from provided screenshots (`DocGen`-style layout) emphasizing sidebar icons, status badges, and action buttons.
- Export table layout reference provided in sample PDF snippet (see image).
- Dashboard action/button styling reference provided in latest UI screen (see image).
- Glossary: Manual (collection of chapters), Chapter (hierarchical node with heading + content), Revision (saved state), Version (approved milestone).
