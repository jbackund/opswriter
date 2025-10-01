# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULE: Database Operations

**ALL database operations (migrations, SQL, schema changes) MUST be delegated to the `database-agent`**
- Use: `Task` tool with `subagent_type: "database-agent"`
- NEVER attempt direct SQL execution or migrations
- The database-agent has special permissions to bypass read-only restrictions

## Project Overview

OpsWriter is a web application for creating, managing, and distributing operational manuals with full revision traceability for regulated organizations. It's designed to be built as a Next.js application hosted on Vercel with Supabase as the backend.

## Technology Stack

- **Frontend**: Next.js 14+ with React and TypeScript
- **Styling**: Tailwind CSS (DocGen-inspired UI)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)
- **Hosting**: Vercel (serverless functions)
- **PDF Generation**: puppeteer-core with @sparticuz/chromium
- **Email**: Resend SDK for transactional emails

## Key Architecture Components

### Manual Structure
- Manuals contain hierarchical chapters (Chapter → Section → Subsection)
- Each chapter has: heading, content blocks, remark field, and page_break toggle
- Chapter 0 is mandatory for all manuals
- Auto-numbering system (e.g., 2.1.4) with automatic reflow on structure changes

### Revision System
- Field-level revision tracking for all changes
- Revision numbering starts at 0, increments on approval
- Draft revisions use decimal sub-revisions (0.1, 0.2)
- Complete audit trail with before/after snapshots
- Immutable history for regulatory compliance

### Review Workflow
- Draft → In Review → Approved/Rejected cycle
- Content frozen during review period
- Authority package generation for review snapshots
- Automatic revision increment upon approval

### Export System
- PDF-only distribution with multiple variants:
  - Draft Watermarked (diagonal DRAFT overlay)
  - Draft Diff (red strikethrough removals, green additions)
  - Clean approved exports
- Auto-generated sections: Record of Revision, Chapters Affected, TOC, Definitions, Abbreviations
- 30-day retention for generated exports

## Database Schema

Key tables to implement in Supabase:
- `manuals` - Core manual metadata and status
- `chapters` - Hierarchical structure with parent references
- `content_blocks` - Rich text content and remarks
- `revisions` - Version snapshots and approval tracking
- `field_history` - Granular change tracking
- `definitions` / `abbreviations` - Reference management
- `manual_definitions` / `manual_abbreviations` - Manual-specific selections
- `audit_logs` - Immutable activity logging
- `export_jobs` - PDF generation tracking

## Development Commands

### Initial Setup
```bash
# Install Next.js with TypeScript and Tailwind
npx create-next-app@latest opswriter --typescript --tailwind --app

# Install core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install puppeteer-core @sparticuz/chromium
npm install resend
npm install @tiptap/react @tiptap/starter-kit  # For rich text editor

# Development
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start
```

### Supabase Setup & Database Migrations

**CRITICAL DATABASE OPERATIONS RULE:**
**✅ ALWAYS use the `database-agent` for ALL database operations**
**❌ NEVER attempt to run SQL or migrations directly**
**The database-agent has specialized tools and permissions that the main assistant lacks.**

**IMPORTANT: Always use Supabase CLI for database migrations and ensure remote is synced with local before making changes.**

```bash
# Initialize Supabase locally (if using CLI)
npx supabase init

# Link to remote project (use project ref from dashboard)
npx supabase link --project-ref mjpmvthvroflooywoyss

# BEFORE making any migrations, sync remote with local:
npx supabase db pull  # Pull remote schema changes
npx supabase migration list --linked  # Check migration status

# Create new migrations (use proper timestamps):
npx supabase migration new <migration_name>
# OR create manually: supabase/migrations/[timestamp]_[name].sql

# Apply migrations to remote database:
npx supabase db push

# If migrations are out of sync, repair them:
npx supabase migration repair --status applied <migration_version>
npx supabase migration repair --status reverted <migration_version>

# Generate TypeScript types from schema
npx supabase gen types typescript --project-id mjpmvthvroflooywoyss > types/supabase.ts
```

#### Database Migration Best Practices:
1. **Always sync before migrations**: Run `npx supabase db pull` before creating new migrations
2. **Use proper timestamps**: Format migrations as `YYYYMMDDHHMMSS_description.sql`
3. **Test locally first**: Use `npx supabase db reset` to test migrations locally if possible
4. **Handle RLS policies**: Include RLS policies in migrations when creating tables
5. **Storage buckets**: Create storage buckets and policies via migrations or using the Supabase dashboard SQL editor

#### When Supabase CLI Cannot Apply Migrations:
If the CLI cannot apply migrations (read-only mode or sync issues), use the Supabase SQL Editor:
1. Go to: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new
2. Copy and paste the SQL from your migration file
3. Execute the SQL manually
4. Update local migration tracking if needed

### Environment Variables
Required in `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Critical Implementation Notes

### Authentication
- Use Supabase Auth with email/password
- Implement 30-minute session timeout
- Two roles: Manager (content CRUD) and SysAdmin (user management + Manager privileges)
- Row-level security policies required on all tables

### PDF Generation
- Use puppeteer-core with @sparticuz/chromium for Vercel compatibility
- Implement as API route with proper timeout handling
- Generate cover page with manual metadata
- Include per-page headers/footers with organization and version info
- Honor chapter page_break toggles

### Rich Text Editor
- Implement Word-like toolbar with formatting options
- Support tables, images, inline references
- Autosave every 30 seconds
- Track changes with author and timestamp metadata

### Performance Considerations
- Dashboard must load < 2 seconds with 500 manuals
- Implement pagination and virtual scrolling for large datasets
- Use Supabase's realtime subscriptions sparingly
- Cache PDF exports in Supabase Storage

### Security Requirements
- HTTPS enforcement
- OWASP Top 10 mitigations
- Encrypted data at rest (AWS KMS via Supabase)
- Immutable audit logs for regulatory compliance
- Role-based access control on all API routes

## UI/UX Guidelines
- Follow DocGen-style layout patterns
- Status badges: green (Send in review), orange (Create draft), blue (Approved), red (Rejected)
- Left-hand navigation tree for manual structure
- Sidebar access to Definitions and Abbreviations
- WCAG 2.1 AA compliance for key workflows

## Testing Strategy
- Unit tests for revision logic and numbering
- Integration tests for Supabase operations
- E2E tests for critical flows (create, edit, review, export)
- PDF baseline comparison for export fidelity
- Performance testing for large manual handling

## MCP Server Integration

This project has two MCP (Model Context Protocol) servers configured:

### Context7 Server
- **Purpose**: Retrieve up-to-date documentation and code examples for any library
- **Usage**: Use for getting the latest SDK documentation, API references, and implementation examples
- **Key libraries**: Next.js, React, Supabase client libraries, Tailwind CSS, TipTap editor
- **Commands**:
  - `mcp__context7__resolve-library-id` - Find library IDs
  - `mcp__context7__get-library-docs` - Get documentation

### Supabase Server
- **Purpose**: Direct interaction with the Supabase database and project management
- **Usage**: Use for all database operations, migrations, and Supabase-specific tasks
- **Key operations**:
  - Database: `list_tables`, `execute_sql`, `apply_migration`
  - Development: `create_branch`, `merge_branch`, `list_branches`
  - Monitoring: `get_logs`, `get_advisors` (security/performance checks)
  - Edge Functions: `list_edge_functions`, `deploy_edge_function`
  - Types: `generate_typescript_types`
- **Important**: Always use `apply_migration` for DDL operations, not `execute_sql`

## CRITICAL: Database Operations Protocol

**🚨 MANDATORY: ALL database operations MUST be delegated to the `database-agent` 🚨**

When you encounter ANY of these situations:
- Need to add/modify columns or tables
- Need to run SQL queries or migrations
- Need to create/modify RLS policies
- Need to fix database errors
- Need to check database schema

**IMMEDIATELY use:**
```
Task tool with subagent_type: "database-agent"
```

**DO NOT attempt to:**
- Use `mcp__supabase__execute_sql` directly
- Use `mcp__supabase__apply_migration` directly
- Run SQL through Bash or scripts
- Modify schema through any other means

The database-agent has specialized permissions and tools that bypass read-only restrictions.

## Specialized Agents

Use these specialized agents proactively for complex tasks:

### Database Agent
- **When to use**: **ALWAYS AND IMMEDIATELY** for ANY database operations including:
  - Creating or modifying database schemas
  - Running SQL queries or migrations
  - Adding/removing columns, tables, or indexes
  - Setting up RLS policies
  - Executing any DDL or DML operations
  - Troubleshooting database issues
- **IMPORTANT**: Never attempt database operations directly - always delegate to database-agent
- **Capabilities**: Schema optimization, migration management, query performance analysis, DDL/DML execution
- **Example tasks**: Creating tables, adding columns, applying migrations, managing RLS policies, executing SQL

### Security Agent
- **When to use**: ALWAYS when implementing authentication, RLS policies, or reviewing code for vulnerabilities
- **Capabilities**: Security scanning, auth testing, RLS validation, vulnerability assessment
- **Critical for**: User authentication flows, row-level security, API protection, audit logging

### Integration Agent
- **When to use**: When validating type safety between frontend and backend, testing API endpoints
- **Capabilities**: Cross-system validation, type synchronization, end-to-end testing
- **Key areas**: Supabase types → TypeScript interfaces, API contract validation

### Performance Agent
- **When to use**: When optimizing bundle size, load times, or analyzing performance metrics
- **Capabilities**: Bundle analysis, Core Web Vitals measurement, load time optimization
- **Target metrics**: Dashboard < 2s load, autosave < 300ms p95, PDF generation optimization

### Code Quality Agent
- **When to use**: After implementing features, for refactoring, or enforcing TypeScript/React best practices
- **Capabilities**: Code standards enforcement, refactoring suggestions, TypeScript improvements
- **Focus areas**: Component structure, type safety, code reusability, Tailwind class organization

### General Purpose Agent
- **When to use**: For complex multi-step research or when searching across many files
- **Capabilities**: Deep code searches, complex investigations, multi-step task execution

## Task Management with TODO.md

### Important Guidelines
- **ALWAYS** check TODO.md at the start of any development session to understand current progress
- **IMMEDIATELY** mark tasks as complete `[x]` when they are finished
- **ADD** any new tasks that arise during development to the appropriate section
- **MAINTAIN** the TODO.md file as the single source of truth for project progress
- **UPDATE** task status in real-time as you work through implementation

### Working with TODO.md
The TODO.md file contains 17 main sections covering the entire implementation roadmap:
1. Foundation & Environment
2. Authentication & User Roles
3. Database Schema & Migrations
4. Manual Dashboard
5. Manual Creation & Metadata
6. Manual Structure & Editor
7. Revision Management & Audit Trail
8. Review Workflow
9. Exporting & PDFs
10. Reference Management
11. Notifications & Activity
12. Search & Discovery
13. Administration & Settings
14. Analytics & Reporting
15. Infrastructure & Operations
16. QA & Compliance
17. Documentation & Launch Prep

### Task Tracking Protocol
When working on the project:
1. **Before starting**: Review TODO.md to identify next priority tasks
2. **During work**: Mark tasks as complete using `[x]` immediately upon completion
3. **New discoveries**: Add any newly identified tasks to the relevant section
4. **Sub-tasks**: Break down complex tasks into smaller checkboxes if needed
5. **Dependencies**: Note task dependencies in comments if they exist

### Example Task Updates
```markdown
# Completing a task
- [x] Scaffold Next.js (React/TypeScript) app with Tailwind on Vercel

# Adding a new task discovered during implementation
- [ ] Configure ESLint and Prettier for code consistency

# Breaking down complex tasks
- [ ] Implement Supabase email/password auth flows (login, logout, session refresh)
  - [x] Set up auth providers
  - [x] Create login component
  - [ ] Implement session management
  - [ ] Add logout functionality
```

## Current Implementation Status
The project is in pre-development phase with completed PRD and TODO documentation. No code has been written yet. Begin with foundation setup (Next.js scaffold, Supabase provisioning) before implementing core features in this order:
1. Authentication and user management
2. Manual CRUD and dashboard
3. Chapter structure and editing
4. Revision tracking
5. Review workflow
6. PDF export generation