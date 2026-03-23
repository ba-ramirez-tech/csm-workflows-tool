# Cursor Workflow — Travel Workflow Build Plan

## Prerequisites
1. Install Node.js 18+ and npm
2. Create a Supabase project at supabase.com (free tier is fine)
3. Copy your Supabase URL and anon key
4. Install Cursor IDE
5. Set up Claude API key in Cursor settings ($5 budget)

## Initial Setup (Do This Once)

### Step 1: Create the project
Open terminal and run:
```bash
npx create-next-app@latest travel-workflow --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd travel-workflow
```

### Step 2: Install dependencies
```bash
npm install prisma @prisma/client @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zod next-intl date-fns lucide-react
npx prisma init
npx shadcn@latest init
```

### Step 3: Drop in foundation files
Copy the files from this package into your repo:
- `CLAUDE.md` → repo root
- `prisma/schema.prisma` → replace the generated one
- `docs/` → create this folder and copy all docs

### Step 4: Configure environment
Create `.env.local`:
```
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"
```

### Step 5: Push schema to database
```bash
npx prisma db push
npx prisma generate
```

---

## Build Phases

### Phase 1: Admin Layout + Destination CRUD (Session 1-2)
**Goal:** Get a working admin shell with the first database entity.

**Cursor prompt:**
> Read CLAUDE.md for project context. Build an admin layout at `/src/app/admin/layout.tsx` with a sidebar navigation (Dashboard, Destinations, Hotels, Experiences, Transport, Templates, Clients, Bookings, Calendar). Use shadcn/ui sidebar component. Premium travel aesthetic: dark sidebar with teal accents. Then build a full CRUD for Destinations at `/src/app/admin/destinations/` — list view with search/filter, create form, edit form, detail view. Use Prisma for all database operations via server actions. Include all fields from the Destination model in schema.prisma.

**What this produces:** A working admin panel where you can add your real destinations.

### Phase 2: Accommodation CRUD (Session 3)
**Cursor prompt:**
> Read CLAUDE.md. Build accommodation management at `/src/app/admin/accommodations/`. List view with filters (by destination, by tier, by type). Create/edit forms with all fields from the Accommodation model. Include a photo gallery uploader using Supabase Storage. Show room types as a dynamic form section. Add a destination selector dropdown that queries the destinations table.

### Phase 3: Experiences + Transport CRUD (Session 4-5)
**Cursor prompt (Experiences):**
> Read CLAUDE.md. Build experience management at `/src/app/admin/experiences/`. Same pattern as accommodations — list, create, edit, detail. Include difficulty level selector, language checkboxes, duration input, activity style selector. Filter by destination and category. Reference the Experience model in schema.prisma.

**Cursor prompt (Transport):**
> Build transport route management at `/src/app/admin/transport/`. Each route connects an origin destination to a target destination. Include distance, duration, altitude data, transport mode selector. List view should show routes as "Origin → Destination" with mode icons.

### Phase 4: Contract Management — Super Admin Only (Session 6)
**Cursor prompt:**
> Read CLAUDE.md. Build contract management at `/src/app/admin/contracts/`. This is SUPER_ADMIN only — add role check middleware. Contracts link to accommodations, experiences, or transport routes via polymorphic supplier reference. Show net costs in COP, season selector, validity dates, negotiated perks as a JSON editor. List view should group by supplier with cost summaries. Reference the Contract model in schema.prisma.

### Phase 5: Trip Templates Builder (Session 7-8)
**Cursor prompt:**
> Read CLAUDE.md and reference `/docs/feature-spec.md`. Build trip template management at `/src/app/admin/templates/`. A template has metadata (name, duration, traveler types, tier) and a day-by-day builder. The day builder is a drag-and-drop interface where each day has a destination selector and a list of items (accommodation, experience, transport, meal, free_time). Items reference real entities from the database. Show a visual timeline/calendar preview of the template. Use the TripTemplate, TemplateDay, and DayItem models.

### Phase 6: CRM — Client Management + Discovery (Session 9-10)
**Cursor prompt:**
> Read CLAUDE.md and `/docs/discovery-questions.md`. Build client management at `/src/app/admin/clients/`. List view with lead status pipeline (kanban view: New → Contacted → Discovery Done → Quoted → Won/Lost). Client detail page shows profile info, discovery questionnaire answers, interaction history, and linked quotes. Build the discovery questionnaire as a step-by-step form that saves answers to ClientPreference table. Each question uses the question_key from the discovery questions doc. Include a client interaction logger (calls, emails, WhatsApp, notes).

### Phase 7: Quotation Engine (Session 11-12)
**Cursor prompt:**
> Read CLAUDE.md. Build the quotation system at `/src/app/admin/quotes/`. Creating a quote: select a client, optionally start from a template, set duration and traveler count. The quote builder shows a day-by-day view where each day's items can be swapped (different hotel, different experience). Price calculates automatically from contract costs + margin. Quote can be exported as PDF. Quote status workflow: draft → sent → accepted/rejected. When accepted, create a Booking automatically.

### Phase 8: Booking & Operations (Session 13-14)
**Cursor prompt:**
> Read CLAUDE.md. Build booking management at `/src/app/admin/bookings/`. A booking has stages (étapes) derived from the quote. Each stage has services (hotel, guide, transport) with confirmation status. Build a calendar view showing all current/upcoming bookings on a timeline (like a Gantt chart — reference the Odys operations calendar). Auto-generate ops tasks when a booking is confirmed: book flights, confirm hotels, confirm guides, send roadbook. Build a daily ops dashboard showing today's tasks, today's traveling clients, tomorrow's confirmations needed.

### Phase 9: Roadbook Generator (Session 15-16)
**Cursor prompt:**
> Read CLAUDE.md and `/docs/roadbook-spec.md`. Build the roadbook system. Internal: at `/src/app/admin/bookings/[id]/roadbook/` — a roadbook editor that auto-generates from booking stages, pulls destination safety info, restaurant recommendations, and mapped tips. Each section is editable before publishing. External: at `/src/app/roadbook/[token]` — a beautiful, mobile-responsive public page the client accesses via share link. Sections: trip overview, day-by-day stages with hotel/guide/transport details, mapped tips per destination, restaurant recommendations, safety & health info, emergency contacts, packing list, general info (immigration, currency, phone tips). Design should feel premium — think digital travel magazine.

### Phase 10: Client Trip Builder (Future Phase)
This is the most complex module. Build it after the internal tools are solid.

---

## Tips for Efficient Cursor Sessions

1. **Start each session** by telling Claude Code: "Read CLAUDE.md for project context"
2. **Reference specific docs** when relevant: "See /docs/discovery-questions.md for the question list"
3. **One module per session** — don't try to build everything at once
4. **Test after each phase** — run `npm run dev` and verify the CRUD works before moving on
5. **Commit after each working phase** — use git so you can rollback
6. **When debugging**, paste the error and say: "This error occurred in [file]. Fix it while maintaining the patterns in CLAUDE.md"
7. **For UI polish**, do a separate pass: "Review all pages in /src/app/admin/ and ensure consistent use of shadcn/ui components, proper loading states, and error handling"

## Budget Management
With $5 on Claude API:
- Each Cursor session with Claude costs roughly $0.10-0.50 depending on context size
- You have approximately 10-50 productive sessions
- Keep prompts focused and reference docs by path (don't paste content)
- Build the back-office first (Phases 1-8) — this is where the operational value is
- The roadbook and client builder can come later
