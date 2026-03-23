# AI trip proposals — merged implementation plan

This document merges: (1) Colombie sur mesure Anthropic system prompt + JSON contract, (2) proposal card UI and actions, (3) touchpoint logging, (4) navigation/env, (5) loading/error/empty states.

---

## 1. Anthropic API (`src/app/api/ai/generate-proposal/route.ts`)

- Replace the short `SYSTEM_PROMPT` with the full **Colombie sur mesure** consultant prompt (verbatim from product spec), built by `buildProposalSystemPrompt({ numProposals, outputLanguageLabel })` in e.g. [`src/lib/ai/proposal-system-prompt.ts`](src/lib/ai/proposal-system-prompt.ts).
- Interpolate `{numProposals}` from request `count` (2 or 3). Resolve “write in {language}” from [`Client.preferredLanguage`](prisma/schema.prisma) to an explicit label (French / English / Spanish / German).
- Append a **machine-readable JSON schema** for each proposal item (snake_case): `proposal_name`, `tagline`, `recommended_template`, `duration_days`, `tier`, `why_this_fits`, `day_highlights`, `estimated_price_range` (define as e.g. `{ low_eur_pp: number, high_eur_pp: number }`), `differentiator`. Optionally `recommended_template_id` if the model picks from listed UUIDs.
- Validate response with **Zod** after `extractJson()`; return 502 on parse/validation failure (keep `raw` snippet in dev/error payload for debugging).
- **After successful generation** (before returning JSON to client): call [`logTouchpoint`](src/lib/log-touchpoint.ts) with e.g. `channel: "internal"`, `category: "quotation"`, `subject: "AI proposal generated"`, `summary: "AI proposal generated — {n} options created"` (use `getCurrentUser()` for `agentId`/`agentName` when available).

---

## 2. Display: cards (modal + optional client detail)

- **Primary UX**: Keep generation inside [`AiProposalModal`](src/components/admin/ai-proposal-modal.tsx). After success, render **proposal cards** in the modal (same patterns as existing admin: rounded borders, teal accents, dark mode).
- **Card contents**: proposal name (title), tagline, duration (days), **tier badge** (`STANDARD` | `CHARME` | `LUXURY` — map to existing Tailwind badge styles), **price range** (EUR pp from `estimated_price_range`), **why_this_fits** (body text), **day_highlights** as compact `<ul>` (3–5 lines).
- **Loading**: Full-width state “Generating proposals…” with [`Loader2`](src/components/admin/ai-proposal-modal.tsx) spinner (or equivalent) while `fetch` in flight.
- **Error**: Show API `error` message string when `!res.ok` or validation fails.
- **Discovery gate (implemented)**: Do **not** hard-block generation when discovery data is missing. The agent must always be able to open **Generate AI proposal** and run the model **with or without** rich discovery, per their judgment. When `ClientPreference` count is low or zero, show a **non-blocking** banner in the modal (and/or on the client header): explain that completing intake / discovery **enriches** proposals, with links to `#discovery` and `/admin/clients/[id]/intake` — but **still allow** “Generate” (no disabled primary action solely due to missing prefs). Optional: checkbox **“I’m generating with minimal discovery context”** for explicit consent logging, or skip if redundant.
- **Optional follow-up**: Mirror last-generated or “saved” proposals on the client detail page by reading touchpoint summaries or a JSON field (see §4). Not required for MVP if modal-only cards suffice.

---

## 3. Per-proposal actions

### 3.1 “Create Quote from This”

- New **server action** e.g. `createQuoteFromAiProposalAction` in [`src/app/admin/quotes/actions.ts`](src/app/admin/quotes/actions.ts) (or `src/app/admin/clients/ai-proposal-actions.ts`):
  - Inputs: `clientId`, resolved `templateId` (from `recommended_template` string by **fuzzy match** against published template names/slugs, or null → scratch quote), `duration_days`, `tier` (`TripTier`), `proposalPayload` serialized into [`Quote.notes`](prisma/schema.prisma) or `customizations` JSON (full proposal text + structured fields).
  - Reuse existing template-copy logic from `createQuoteAction` (copy `TemplateDay`/`DayItem` → `QuoteItem`), then `recalculateQuoteTotals`.
  - `redirect(\`/admin/quotes/${id}\`)` after create.

### 3.2 “Save for Later”

- **Default**: [`logTouchpoint`](src/lib/log-touchpoint.ts) with `category: "quotation"` or `"follow_up"`, `summary` containing a readable block or stringified JSON of the proposal (within 8000 char limit); optional `contentType: "ai_proposal_saved"`.
- **Optional**: Add `Client.aiSavedProposals Json?` (array of saved proposals) via Prisma migration if you need structured reload on the client page without parsing touchpoints—defer unless product requires it.

---

## 4. Environment

- Document **`ANTHROPIC_API_KEY`** in [env.example](env.example) (already present—ensure wording matches: agent fills real key in `.env` / `.env.local`). No secret values committed.

---

## 5. Navigation ([`admin-shell.tsx`](src/components/admin/admin-shell.tsx))

- Reorder **`allNavItems`**: place **Quotes** **between Clients and Bookings** (not between Templates and Intakes).
- Set Quotes icon to **`FileText`** per spec.
- **Icon clash**: Templates currently use `FileText`. Change Templates to a distinct icon (e.g. `Layers`, `LayoutTemplate`, or `BookMarked`) so Quotes and Templates are visually distinct.
- Active state: existing `isActivePath(pathname, href)` already uses `pathname.startsWith(href)` for non-root admin routes—verify `/admin/quotes` and `/admin/quotes/...` highlight **Quotes** only (not Clients). Adjust if any collision (e.g. `/admin/clients` vs `/admin/clients/...`).

---

## 6. Typescript & Tailwind

- Shared types for API response + card props in e.g. [`src/lib/ai/proposal-types.ts`](src/lib/ai/proposal-types.ts) (exported from Zod inference where possible).
- All new UI in TSX with Tailwind; no inline styles except if matching existing print patterns.

---

## 7. Files to add or touch (summary)

| Area | Files |
|------|--------|
| Prompt + Zod | `src/lib/ai/proposal-system-prompt.ts`, `src/lib/ai/proposal-response-schema.ts` |
| API | `src/app/api/ai/generate-proposal/route.ts` |
| Touchpoints | `src/lib/log-touchpoint.ts` (maybe small helper `logAiProposalGenerated`) |
| Quote create | `src/app/admin/quotes/actions.ts` (+ template name → id resolver util) |
| UI | `src/components/admin/ai-proposal-modal.tsx`, `src/app/admin/clients/[id]/page.tsx` |
| Nav | `src/components/admin/admin-shell.tsx` |
| Schema (optional) | `prisma/schema.prisma` only if persisting saved proposals on Client |
| Env docs | `env.example` |

---

## 8. Deal context — always feed the model (revised requirement)

Successful and unsuccessful commercial history should **always** be included in the **user** message to Claude (in addition to preferences, templates, and focus note), so proposals reflect pipeline reality.

**Suggested sources** (map to existing Prisma models):

- **Successful / active deals**: `Booking` for this `clientId` — include `dossierNumber`, `status`, `travelStart`/`travelEnd`, `totalPriceCop`/`currency` (or formatted), optionally stage destinations via `BookingStage` if query stays light.
- **Unsuccessful / pipeline**: `Quote` rows — `status` in `rejected`, `expired`, and optionally `draft`/`sent` that did not convert; include name, status, dates, currency/total if useful.
- **Lead outcome**: [`Client.leadStatus`](prisma/schema.prisma) — especially `LOST` vs `WON`-adjacent states; include as one line in context.
- **Optional later**: recent `ClientTouchpoint` rows with category `quotation` / outcomes mentioning “lost” or “won” if you need narrative CRM signal (keep token budget in mind).

**API change**: In [`generate-proposal/route.ts`](src/app/api/ai/generate-proposal/route.ts), `Promise.all` should also load bookings (limited fields, ordered by `travelStart` desc) and quotes (ordered by `updatedAt` desc, cap e.g. 15 each), format as markdown sections `## Bookings (success / operations)` and `## Quotes & outcomes (incl. unsuccessful)` and append to `userContent`.

**System prompt**: Add one line instructing the model to **use** this history to differentiate proposals and avoid repeating failed angles, without inventing numbers not present in context.

---

## 9. Execution order (when implementing)

1. Schema/types + system prompt + API validation + auto touchpoint on success. **Done**
2. Modal: loading / error / cards / buttons wired to server actions. **Done**
3. **Revise discovery gate**: remove hard block; banner + links + generate always available (see §2). **Done** (`discoveryPreferenceCount`, `AiProposalModal`, client page)
4. **Extend API context**: bookings + quotes + lead status in `userContent` (see §8). **Done** (`proposal-deal-context.ts`, `generate-proposal/route.ts`, system prompt)
5. `createQuoteFromAiProposalAction` + redirect. **Done**
6. `Save for Later` touchpoint. **Done**
7. Nav reorder + icon swap + active path check. **Done**
8. Manual QA: with/without discovery, deal context in prompt, create quote, save for later, timeline. **Ongoing**
