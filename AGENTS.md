# Repository Guidelines

## Project Structure & Module Organization
- `app/` — Next.js pages and API routes orchestrating manual dashboards, editor flows, and exports.
- `components/` — Reusable React/Tailwind UI (sidebar, tables, editor widgets).
- `lib/` — Supabase client, audit logging helpers, PDF renderer utilities (`puppeteer-core` + `@sparticuz/chromium`).
- `supabase/` — SQL migrations, functions, and storage policies tied to revision history and audit logs.
- `tests/` — Jest and Playwright suites covering unit, integration, and PDF diff checks.
- `public/` — Static assets (logos, fonts) used for cover pages and branding.

## Build, Test, and Development Commands
- `npm run dev` — Launches Next.js with live reload against Supabase local stack.
- `npm run lint` — Runs ESLint + Tailwind lint rules.
- `npm run test` — Executes Jest unit tests.
- `npm run test:e2e` — Runs Playwright end-to-end suites (dashboard, editor, exports).
- `npm run build && npm run start` — Production build preview matching Vercel deployment.

## Coding Style & Naming Conventions
- TypeScript with strict mode; use interfaces for API payloads.
- Follow ESLint + Prettier defaults (2-space indent, single quotes, semicolons).
- Components use PascalCase (`ManualDashboard.tsx`); utilities use camelCase (`formatRevision.ts`).
- Tailwind classes grouped logically (`layout` → `spacing` → `color`).

## Testing Guidelines
- Prefer Jest + React Testing Library for UI logic; snapshot complex PDFs via golden files.
- Playwright specs live under `tests/e2e/` named `<feature>.spec.ts`.
- Maintain ≥80% coverage; flag gaps in PR description.
- Use Supabase CLI to seed fixture data before end-to-end runs.

## Commit & Pull Request Guidelines
- Commit messages: imperatives under 72 chars (`Add PDF header renderer`).
- Scope commits narrowly; include updated tests/assets as needed.
- PR checklist: summary, linked Linear/Jira issue, screenshots or PDF samples for UI/export changes, verification steps.
- Request review from at least one engineer + product stakeholder before merge.
