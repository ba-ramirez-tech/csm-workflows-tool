import { NextResponse } from "next/server";
import { z } from "zod";
import { formatBookingsForPrompt, formatQuotesForPrompt, formatTouchpointsForPrompt } from "@/lib/ai/proposal-deal-context";
import { buildProposalSystemPrompt, preferredLanguageToLabel } from "@/lib/ai/proposal-system-prompt";
import { aiProposalResponseSchema } from "@/lib/ai/proposal-response-schema";
import { getAnthropicApiKey } from "@/lib/ai/env";
import { logAiProposalGenerated } from "@/lib/log-touchpoint";
import { prisma } from "@/lib/prisma";

const MISSING_KEY_MESSAGE =
  "ANTHROPIC_API_KEY is missing or empty after trim. Set it on a single line in .env or .env.local (no line breaks inside the value). See env.example.";
const TRUNCATION_ERROR_CODE = "ai_output_truncated";
const TRUNCATION_MESSAGE =
  "La reponse IA a ete tronquee avant la fin du JSON. Reessayez avec un brief plus court ou 2 variantes.";

export const maxDuration = 120;

const bodySchema = z.object({
  clientId: z.string().uuid(),
  count: z.union([z.literal(2), z.literal(3)]).default(2),
  focusNote: z.string().max(4000).optional(),
});

function formatPreferences(
  rows: { questionKey: string; answerValue: string; answerJson: unknown; notes: string | null }[],
): string {
  return rows
    .map((r) => {
      const parts = [r.answerValue];
      if (r.answerJson) parts.push(`(${JSON.stringify(r.answerJson)})`);
      if (r.notes) parts.push(`note: ${r.notes}`);
      return `- ${r.questionKey}: ${parts.join(" ")}`;
    })
    .join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [];
  candidates.push(trimmed);

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  // Fallback: some model responses include prose before/after JSON.
  // Try to recover the first balanced object/array block.
  const extracted = extractBalancedJsonBlock(trimmed);
  if (extracted) candidates.push(extracted);

  for (const raw of candidates) {
    try {
      return JSON.parse(raw);
    } catch {
      // try next candidate
    }
  }
  throw new Error("No valid JSON object/array found in model output.");
}

function extractBalancedJsonBlock(input: string): string | null {
  const starts = ["{", "["] as const;
  for (const startCh of starts) {
    const start = input.indexOf(startCh);
    if (start < 0) continue;
    const maybe = readBalancedJson(input, start);
    if (maybe) return maybe;
  }
  return null;
}

function readBalancedJson(input: string, startIndex: number): string | null {
  const open = input[startIndex];
  const close = open === "{" ? "}" : open === "[" ? "]" : "";
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) {
        return input.slice(startIndex, i + 1).trim();
      }
    }
  }
  return null;
}

function hasLikelyIncompleteJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const startsWithJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!startsWithJson) return false;
  return extractBalancedJsonBlock(trimmed) == null;
}

type AnthropicResponseJson = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  stop_sequence?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

async function callAnthropic(params: {
  key: string;
  systemPrompt: string;
  userContent: string;
  maxTokens: number;
}): Promise<
  | { ok: true; data: AnthropicResponseJson }
  | { ok: false; status: number; text: string }
> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userContent }],
    }),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: true, data: (await res.json()) as AnthropicResponseJson };
}

export async function POST(req: Request) {
  const key = getAnthropicApiKey();
  if (!key) {
    return NextResponse.json({ error: MISSING_KEY_MESSAGE }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const { clientId, count, focusNote } = parsedBody.data;

  const [client, prefs, templates, bookings, quotes, touchpoints] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.clientPreference.findMany({
      where: { clientId },
      select: { questionKey: true, answerValue: true, answerJson: true, notes: true },
    }),
    prisma.tripTemplate.findMany({
      where: { isPublished: true, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        durationDays: true,
        travelerTypes: true,
        description: true,
        slug: true,
      },
    }),
    prisma.booking.findMany({
      where: { clientId },
      orderBy: { travelStart: "desc" },
      take: 15,
      select: {
        dossierNumber: true,
        status: true,
        travelStart: true,
        travelEnd: true,
        numTravelers: true,
        totalPriceCop: true,
        currency: true,
      },
    }),
    prisma.quote.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: {
        name: true,
        status: true,
        durationDays: true,
        totalPriceCop: true,
        currency: true,
        updatedAt: true,
      },
    }),
    prisma.clientTouchpoint.findMany({
      where: {
        clientId,
        direction: { not: "internal" },
        channel: { not: "internal" },
        category: { not: "operational" },
      },
      orderBy: { touchpointAt: "desc" },
      take: 20,
      select: {
        channel: true,
        category: true,
        direction: true,
        subject: true,
        summary: true,
        outcome: true,
        touchpointAt: true,
      },
    }),
  ]);

  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const templateBlock = templates
    .map((t) => {
      const desc =
        t.description && typeof t.description === "object" && t.description !== null && "fr" in t.description
          ? String((t.description as { fr?: string }).fr ?? "")
          : "";
      return `- id=${t.id} | ${t.name} | slug=${t.slug} | ${t.durationDays}d | travelers=${t.travelerTypes.join(",")} | ${desc.slice(0, 400)}`;
    })
    .join("\n");

  const systemPrompt = buildProposalSystemPrompt({
    numProposals: count,
    outputLanguageLabel: preferredLanguageToLabel(client.preferredLanguage),
  });

  const userContent = [
    `Generate exactly ${count} proposals.`,
    "",
    "## Client",
    `Name: ${client.name}`,
    `preferredLanguage (documents): ${client.preferredLanguage}`,
    `spokenLanguages: ${client.spokenLanguages.join(", ") || "—"}`,
    `guideLanguage: ${client.guideLanguage ?? "—"}`,
    "",
    "## Client profile signals (fiche client, non-operational)",
    `nationality: ${client.nationality ?? "—"}`,
    `travelerType: ${client.travelerType ?? "—"}`,
    `tier: ${client.tier ?? "—"}`,
    `source: ${client.source ?? "—"}`,
    `agencyName: ${client.agencyName ?? "—"}`,
    `clientNotes: ${client.notes ?? "—"}`,
    "",
    "## Lead status",
    String(client.leadStatus),
    "",
    "## Bookings (operations / confirmed trips — internal totals in COP where shown)",
    formatBookingsForPrompt(bookings),
    "",
    "## Quotes (pipeline, incl. draft / sent / rejected / expired)",
    formatQuotesForPrompt(quotes),
    "",
    "## Client-facing touchpoints (free text from calls/messages/emails; internal/operational excluded)",
    formatTouchpointsForPrompt(touchpoints),
    "",
    "## Discovery preferences (key / answer / note)",
    formatPreferences(prefs) ||
      "(no preference rows — you may still generate using lead status, deal history, templates, and focus note; enrichment via intake is recommended)",
    "",
    "## Published templates (use recommended_template_id only from these ids)",
    templateBlock || "(no published templates)",
    "",
    focusNote ? `## Agent focus note\n${focusNote}\n` : "",
  ].join("\n");

  const firstAttempt = await callAnthropic({
    key,
    systemPrompt,
    userContent,
    maxTokens: 8192,
  });
  if (!firstAttempt.ok) {
    const errText = firstAttempt.text;
    let authHint: string | undefined;
    try {
      const parsed = JSON.parse(errText) as { error?: { type?: string; message?: string } };
      if (parsed?.error?.type === "authentication_error" || firstAttempt.status === 401) {
        authHint =
          "Anthropic rejected this API key (invalid or revoked). Create a new key at https://console.anthropic.com/settings/keys and set ANTHROPIC_API_KEY in .env.local on one line, e.g. ANTHROPIC_API_KEY=\"sk-ant-api03-...\" then restart the dev server.";
      }
    } catch {
      /* not JSON */
    }
    return NextResponse.json(
      {
        error: authHint ?? "Anthropic API error",
        status: firstAttempt.status,
        detail: errText.slice(0, 2000),
      },
      { status: firstAttempt.status === 401 ? 401 : 502 },
    );
  }

  const firstJson = firstAttempt.data;
  const firstText = firstJson.content
    ?.filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n")
    .trim();
  if (!firstText) {
    return NextResponse.json({ error: "Empty model response." }, { status: 502 });
  }

  let raw: unknown | null = null;
  let parseError: string | null = null;
  try {
    raw = extractJson(firstText);
  } catch (e) {
    parseError = String(e);
  }

  const firstLikelyTruncated =
    firstJson.stop_reason === "max_tokens" || hasLikelyIncompleteJson(firstText);

  if (raw == null && firstLikelyTruncated) {
    const compactPrompt = `${systemPrompt}

Output budget mode:
- Keep day narratives concise (about 70-140 words per day).
- Keep presentation to 90-160 words.
- Keep why_this_fits to 2-3 sentences.
- Keep total response compact while still valid and specific.
- Output JSON only.`;

    const secondAttempt = await callAnthropic({
      key,
      systemPrompt: compactPrompt,
      userContent,
      maxTokens: 8192,
    });

    if (secondAttempt.ok) {
      const secondJson = secondAttempt.data;
      const secondText = secondJson.content
        ?.filter((c) => c.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string)
        .join("\n")
        .trim();
      if (secondText) {
        try {
          raw = extractJson(secondText);
        } catch (e) {
          parseError = String(e);
          const secondLikelyTruncated =
            secondJson.stop_reason === "max_tokens" || hasLikelyIncompleteJson(secondText);
          if (secondLikelyTruncated) {
            return NextResponse.json(
              {
                code: TRUNCATION_ERROR_CODE,
                error: TRUNCATION_MESSAGE,
                stop_reason: secondJson.stop_reason ?? null,
                raw: secondText.slice(0, 4000),
              },
              { status: 502 },
            );
          }
          return NextResponse.json(
            { error: "Failed to parse model JSON.", raw: secondText.slice(0, 4000), cause: parseError },
            { status: 502 },
          );
        }
      }
    } else {
      // Keep original parse failure visible if retry API call fails.
      if (secondAttempt.status === 401) {
        return NextResponse.json(
          {
            error:
              "Anthropic rejected this API key (invalid or revoked). Create a new key at https://console.anthropic.com/settings/keys and set ANTHROPIC_API_KEY in .env.local on one line, then restart the dev server.",
            status: 401,
            detail: secondAttempt.text.slice(0, 2000),
          },
          { status: 401 },
        );
      }
    }
  }

  if (raw == null) {
    if (firstLikelyTruncated) {
      return NextResponse.json(
        {
          code: TRUNCATION_ERROR_CODE,
          error: TRUNCATION_MESSAGE,
          stop_reason: firstJson.stop_reason ?? null,
          raw: firstText.slice(0, 4000),
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Failed to parse model JSON.", raw: firstText.slice(0, 4000), cause: parseError ?? undefined },
      { status: 502 },
    );
  }

  const validated = aiProposalResponseSchema.safeParse(raw);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "Model response did not match the expected schema.",
        issues: validated.error.flatten(),
        raw: text.slice(0, 4000),
      },
      { status: 502 },
    );
  }

  if (validated.data.proposals.length !== count) {
    return NextResponse.json(
      {
        error: `Expected ${count} proposals, got ${validated.data.proposals.length}.`,
        raw: text.slice(0, 2000),
      },
      { status: 502 },
    );
  }

  try {
    await logAiProposalGenerated(clientId, count);
  } catch {
    // non-fatal
  }

  return NextResponse.json(validated.data);
}
