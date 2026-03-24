# Travel Workflow

Full-stack operations platform for managing bespoke travel experiences with no stress — from lead capture to trip delivery and quality.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Claude AI API](https://img.shields.io/badge/Claude_AI_API-7A5AF8?style=for-the-badge)

## What This Is

Travel Workflow is a real business application built for an operating travel company or Destination Management Company in bespoke travel.  
It manages the full operational lifecycle:

**lead capture -> discovery -> quotation -> booking -> operations -> client roadbook**

It also integrates Claude AI to automatically generate personalized travel proposals based on real client context, backend data, and rules.

## Key Features

- **Inventory management**: destinations, accommodations, experiences, transport routes, and contract cost layers.
- **Trip template builder**: day-by-day itinerary composer with supplier-linked references.
- **CRM + discovery questionnaire**: 7-step intake flow, client profiles, and lead pipeline view.
- **AI proposal generator**: Claude API generates 2-3 personalized options from fiche client + preferences.
- **Quotation engine**: contract-based pricing, margin logic, and PDF export support.
- **Client touchpoint timeline**: complete interaction history across channels.
- **Shareable intake forms**: embeddable and WhatsApp-shareable with autosave behavior.
- **Document management**: passports, insurance, and flight information tracking.
- **Role-based access**: super admin can view contract costs; operatives access the remaining active modules.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma (30+ models)
- **AI**: Anthropic Claude API for proposal generation
- **Auth**: Supabase Auth (role-based)
- **Deployment**: Vercel-ready

## Run Locally in 60 Seconds

```bash
# 1) Install dependencies
npm install

# 2) Configure environment
cp env.example .env.local
# Fill DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# 3) Sync schema and generate Prisma client
npx prisma db push
npm run db:generate

# 4) Start app
npm run dev
```

Open `http://localhost:3000`.

Note: this repo runs local dev with `next dev --webpack` for route stability in this project.

## Highlights

- Built as an operations-first platform for a real DMC workflow, not a demo-only CRUD app.
- Covers the full funnel in one system: intake, CRM discovery, AI proposals, quoting, and delivery operations.
- Uses strict schema validation plus resilient AI-response handling to reduce runtime failures.
- Integrates AI where it creates practical leverage for teams (proposal drafting and workflow acceleration).
- Designed to reduce context switching for agents by centralizing client history, documents, and decisions.

## Screenshots

Screenshots coming soon.

## Architecture

The project follows a clear App Router structure:

- `src/app/admin/*` for internal operations dashboards and modules
- `src/app/intake/*`, `src/app/operational/*`, and `src/app/roadbook/*` for client-facing/public workflows
- `src/app/api/*` for server-side endpoints (AI generation, intake submission, automation hooks)
- `src/lib/*` for domain logic (pricing, touchpoints, AI prompt orchestration, email, auth)

Development was guided by:

- `CLAUDE.md` for project-level context and conventions
- `docs/*` for implementation specs, workflows, and feature decisions

## Thought Process

I built this in iterative product phases, validating each operational step against real business usage instead of building in isolation.

- Started with core data architecture and workflow primitives (clients, quotes, bookings, operations).
- Added high-leverage automation where operational friction was highest (proposal generation, quote workflows, timeline logging).
- Tested with real-world scenarios, captured errors during manual QA, and used those notes to drive structured debugging and refactors.
- Practiced stepping back during failures to analyze not only *what* broke, but *how* decisions and assumptions produced the issue.
- Prioritized shipping practical value first, then tightening reliability, clarity, and maintainability.

## Learning, Improvements, Next Steps

- **What I learned**: designing software around business constraints, shipping AI-assisted features responsibly, and balancing strict data validation with resilient UX.
- **Challenges tackled**: long-form AI JSON truncation, route reliability, quote mapping consistency, and traceable proposal lifecycle logging.
- **New tools/tech growth**: deeper Prisma modeling, server actions patterns, AI prompt + schema strategies, and ops-centric product thinking.
- **UX insights**: preserve user input aggressively, keep operators in flow, and make state transitions explicit and auditable.
- **What could be improved next**: stronger automated tests for quote-generation mappings, richer proposal editing UX, analytics dashboards, and tighter permissions.
- **How to keep evolving**: continue phase-based roadmap execution, add observability around AI and pricing flows, and tighten CI quality gates.
- **Live demo video (virtual walk-through)**: [Watch on VEED](https://www.veed.io/view/87f09802-8715-4ac3-ae38-b239799b9c8e?source=editor&panel=share)

## Status

Active development — Phases 1-7 of 11 complete. Built in collaboration with AI-assisted development (Cursor + Claude).

## Author

**B.A. Ramirez** — Travel industry professional now evolving in IT and building tech solutions that save time and money.
