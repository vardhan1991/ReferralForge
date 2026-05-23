# ReferralForge MVP Issue List

This is the short next-step backlog for turning the current working MVP into a stronger product foundation.

## Milestone 1: Product Foundation

### 1. Migrate the UI to Next.js 15

Priority: P0  
Type: Architecture / Frontend

Goal: Move the current static dashboard into a real Next.js app with typed routes, reusable components, and production build support.

Acceptance criteria:
- Next.js 15 app runs locally with `pnpm dev`.
- Current guided workflow is preserved.
- Components are split into reusable feature modules.
- `pnpm build` succeeds.
- Existing API contracts are represented with shared TypeScript types.

### 2. Replace JSON Storage With Prisma + PostgreSQL

Priority: P0  
Type: Backend / Data

Goal: Persist jobs, candidate profiles, match analyses, contacts, outreach drafts, and tracker records in PostgreSQL.

Acceptance criteria:
- Prisma migrations run successfully.
- Repository layer abstracts storage from services.
- Runtime JSON store is removed from production code paths.
- Seed script creates sample job, resume, analysis, and tracker data.
- Tests cover create/read flows for core entities.

### 3. Add Authentication and User Boundaries

Priority: P0  
Type: Security / Product

Goal: Add real user sessions so resumes, jobs, profile memory, and outreach records are private per user.

Acceptance criteria:
- Clerk or NextAuth is configured.
- Protected dashboard routes require sign-in.
- API requests are scoped to the authenticated user.
- Unauthenticated access cannot read saved jobs or resume profiles.
- Session secret and auth config are documented in `.env.example`.

## Milestone 2: AI Quality

### 4. Add OpenAI Structured Output Adapters

Priority: P1  
Type: AI / Backend

Goal: Wire OpenAI JSON-mode outputs behind the existing deterministic services for richer analysis, rewriting, and outreach.

Acceptance criteria:
- Prompt files remain versioned under `src/ai/prompts`.
- AI outputs are validated before returning to the UI.
- Deterministic fallback still works when no API key is configured.
- Token usage is logged per request.
- Tests use mocked AI responses.

### 5. Strengthen Anti-Hallucination Guardrails

Priority: P1  
Type: AI Safety / Resume

Goal: Prevent fabricated tools, metrics, companies, titles, certifications, dates, awards, and team sizes.

Acceptance criteria:
- Rewrite outputs include evidence references to source resume text.
- Unsupported additions are blocked or marked as insufficient data.
- Tests cover fake metrics, fake tools, fake certifications, and fake employers.
- UI explains when user confirmation is required.

### 6. Improve Resume and JD File Parsing

Priority: P1  
Type: Parsing / Backend

Goal: Improve PDF, DOCX, and screenshot extraction quality.

Acceptance criteria:
- PDF text extraction handles common resume layouts.
- DOCX extraction uses structured document parsing.
- OCR adapter handles image screenshots when enabled.
- File validation rejects unsupported and oversized files.
- Parsing tests include multi-column resumes, tables, icons, and sparse PDFs.

## Milestone 3: Referral Workflow

### 7. Build Modular Contact Provider Adapters

Priority: P1  
Type: Referrals / Integrations

Goal: Make referral discovery provider-driven, safe, and replaceable.

Acceptance criteria:
- Provider interface supports search, scoring metadata, retry, and rate-limit behavior.
- Mock provider remains available for tests.
- LinkedIn is user-assisted by default.
- Google/Hunter/Apollo/Clearbit adapters can be added without changing UI contracts.
- Provider failures return graceful fallback messages.

### 8. Add Outreach Draft Management

Priority: P2  
Type: Product / CRM

Goal: Let users save, edit, compare, and track outreach drafts per contact.

Acceptance criteria:
- Drafts are persisted per application and contact.
- User can generate LinkedIn DM, email, follow-up, and referral ask variants.
- Draft status supports drafted, sent, followed up, responded.
- Tracker reflects outreach status.
- Generated messages can be edited before saving.

### 9. Improve Application Tracker Interactions

Priority: P2  
Type: Frontend / Product

Goal: Turn the current kanban into a useful application pipeline.

Acceptance criteria:
- Applications can be moved between stages.
- Notes can be edited.
- Referral and outreach status can be updated.
- Resume version is visible per application.
- Empty states guide the next action.

## Milestone 4: Deployability

### 10. Make Docker Compose Validation Fully Runnable

Priority: P2  
Type: DevOps

Goal: Ensure the app, Postgres, Redis, migrations, seed, and validation run from Docker Compose.

Acceptance criteria:
- `docker compose up --build` starts the app.
- `docker compose up validation` runs lint, tests, and build.
- Postgres and Redis health checks are configured.
- README setup steps match the real commands.

### 11. Add CI Checks for Pull Requests

Priority: P2  
Type: CI / Quality

Goal: Keep the MVP stable as it evolves.

Acceptance criteria:
- GitHub Actions runs typecheck, lint, tests, and build.
- E2E tests run where browser dependencies are available.
- CI fails on committed `.env`, runtime logs, or store files.
- README documents local and CI validation paths.

### 12. Add Deployment Targets

Priority: P3  
Type: Release / Infrastructure

Goal: Prepare the app for a realistic staging deployment.

Acceptance criteria:
- Frontend can deploy to Vercel.
- Database can run on Railway, Render, Supabase, or Neon.
- Redis can run on Upstash or Railway.
- Production env var checklist is documented.
- Smoke test confirms deployed health endpoint and dashboard render.
