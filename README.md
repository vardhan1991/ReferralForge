# ReferralForge

ReferralForge is a full-stack MVP for job seekers who want to tailor applications to specific job postings, improve ATS fit, find warmer referral paths, generate concise outreach, and track the whole pipeline.

This repository is structured so the local zero-install build runs immediately with Node 24, while the production manifest and Prisma schema are ready for a Next.js 15 / PostgreSQL / Redis deployment once dependencies are installed.

## Architecture

Frontend:
- `web/` contains a responsive SaaS dashboard with dark/light theme, sidebar navigation, command palette, toast notifications, skeleton states, score heatmaps, referral cards, outreach drafts, and a kanban tracker.
- The production dependency manifest includes Next.js 15, React, TailwindCSS, shadcn/ui-compatible styling boundaries, Zustand, and Framer Motion.

Backend:
- `src/server.ts` exposes JSON APIs for job parsing, resume parsing, analysis, rewrites, referrals, outreach, profile memory, and tracking.
- Services are split by domain: parsing, analysis, referrals, outreach, tracker, storage, security, observability.
- `src/storage/json-store.ts` is the local repository implementation. `prisma/schema.prisma` is the PostgreSQL production schema.

AI and NLP:
- Deterministic local engines provide testable parsing, scoring, anti-hallucination rewrite suggestions, contact scoring, and outreach generation.
- `src/ai/prompts/` contains versioned structured prompts for OpenAI JSON-mode adapters.
- OpenAI calls can be added behind the existing service boundaries without changing UI contracts.

Parsing:
- URL provider detection supports LinkedIn, Indeed, FoundIt, Monster India, raw text, and uploaded files.
- PDF/DOCX/image extraction has safe local fallbacks. Production adapters should use PyMuPDF/pdfplumber, python-docx, and OCR.
- LinkedIn is designed as user-assisted first, with optional browser automation behind a disable-able adapter.

Security:
- File type and size validation
- Rate limiting
- Input sanitization
- No raw resume persistence required by default
- Environment-based secrets
- GDPR-conscious profile memory model

## Folder Structure

```text
referralforge/
  web/                    # Dashboard UI
  src/
    ai/prompts/           # Structured prompt versions
    analysis/             # Match engine and guarded rewrites
    lib/                  # Text utilities
    observability/        # Structured logging
    outreach/             # Outreach generator
    parsing/              # JD/resume/document parsers
    referrals/            # Modular referral contact engine
    security/             # Rate limiting and validation helpers
    shared/               # Types and runtime schema helpers
    storage/              # Repository implementation
    tracker/              # Application tracker service
    server.ts             # API and static server
  prisma/schema.prisma    # PostgreSQL schema
  tests/                  # Unit and E2E API tests
  scripts/                # Validation and seed scripts
  sample-data/            # JD and resume fixtures
  docker-compose.yml
  Dockerfile
```

## API Design

- `GET /api/health`
- `POST /api/jobs/parse`
- `POST /api/resumes/parse`
- `POST /api/analyze`
- `POST /api/rewrite`
- `POST /api/referrals/search`
- `POST /api/outreach/generate`
- `GET /api/tracker/applications`
- `GET /api/profile`
- `POST /api/profile`

## Local Setup

Use the Node 24 runtime available in this environment:

```powershell
cd "C:\Users\Dexter\OneDrive\Documents\New project\referralforge"
& "C:\Users\Dexter\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --experimental-strip-types src/server.ts
```

Then open:

```text
http://localhost:4173
```

Seed sample data:

```powershell
& "C:\Users\Dexter\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --experimental-strip-types scripts/seed.ts
```

Run validation:

```powershell
& "C:\Users\Dexter\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/validate.mjs
```

With a normal package manager available:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run e2e
npm run build
```

## Docker

Validate Compose:

```bash
docker compose config
```

Run the stack:

```bash
docker compose up --build
```

Validation service:

```bash
docker compose up validation
```

## Environment Variables

Copy `.env.example` and set:

- `OPENAI_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `STORE_RAW_RESUMES`
- `LINKEDIN_AUTOMATION_ENABLED`
- `SCRAPE_RATE_LIMIT_PER_HOUR`
- `SENTRY_DSN`
- `POSTHOG_KEY`

## Testing Coverage

Implemented automated tests cover:

- LinkedIn, Indeed, FoundIt, Monster India, raw JD, unsupported URLs, CAPTCHA fallback, incomplete JDs
- PDF/DOCX-like resume parsing, multi-column/table/icon-style formatting, duplicate skill merging, date duration normalization
- Strong/weak matches, missing skills, leadership-heavy and technical-heavy profiles
- Rewrite anti-hallucination rules
- Outreach personalization, concise tone, spam and AI-detection heuristics
- End-to-end API flow from intake to outreach

## Production Evolution Notes

Recommended next upgrades:

- Replace JSON store with Prisma repositories.
- Add NextAuth or Clerk.
- Add OpenAI JSON-mode adapters using the prompt contracts.
- Add Redis-backed queues for scraping and contact discovery.
- Add OpenTelemetry exporters, Sentry, and PostHog.
- Add real provider adapters for Hunter/Apollo/Clearbit/Google programmable search.
- Add a Chrome extension under `apps/extension` for user-assisted job imports.
