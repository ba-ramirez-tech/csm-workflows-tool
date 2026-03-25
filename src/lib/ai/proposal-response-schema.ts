import { z } from "zod";

const tierEnum = z.enum(["BUDGET", "STANDARD", "CHARME", "LUXURY"]);

export const transportEntryAiSchema = z.object({
  type: z.string().min(1),
  route: z.string().default(""),
  duration: z.string().optional().default(""),
  tip: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const proposalDaySchema = z.object({
  day_number: z.coerce.number().int().min(1).max(60),
  title: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  transport: z.array(transportEntryAiSchema).default([]),
  accommodation: z.string().optional().nullable(),
});

export const aiProposalItemSchema = z
  .object({
    proposal_name: z.string().min(1),
    tagline: z.string().min(1),
    recommended_template: z.string().min(1),
    recommended_template_id: z.string().uuid().nullable().optional(),
    duration_days: z.coerce.number().int().min(3).max(60),
    tier: tierEnum,
    presentation: z.string().optional().default(""),
    why_this_fits: z.string().min(1),
    days: z.array(proposalDaySchema),
    /** Optional cross-cutting bullets (not a duplicate of each day's title). */
    day_highlights: z.array(z.string()).optional().default([]),
    estimated_price_range: z.union([
      z.string().min(1),
      z.object({
        low_eur_pp: z.coerce.number().nonnegative(),
        high_eur_pp: z.coerce.number().nonnegative(),
      }),
    ]),
    differentiator: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const n = data.duration_days;
    if (data.days.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `days must have exactly ${n} entries (one per day).`,
        path: ["days"],
      });
      return;
    }
    const nums = [...data.days].map((d) => d.day_number).sort((a, b) => a - b);
    const expected = Array.from({ length: n }, (_, i) => i + 1);
    const ok = nums.length === expected.length && nums.every((v, i) => v === expected[i]);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `days day_number must run from 1 to ${n} exactly once each.`,
        path: ["days"],
      });
    }
  });

export const aiProposalResponseSchema = z.object({
  proposals: z.array(aiProposalItemSchema).min(1).max(5),
});

export type AiProposalItem = z.infer<typeof aiProposalItemSchema>;
export type AiProposalResponse = z.infer<typeof aiProposalResponseSchema>;
export type ProposalDayAi = z.infer<typeof proposalDaySchema>;

/** Normalize AI / legacy price shapes to a single display string. */
export function formatAiEstimatedPriceRange(
  value: AiProposalItem["estimated_price_range"],
): string {
  if (typeof value === "string") return value;
  return `${value.low_eur_pp.toLocaleString("fr-FR")} – ${value.high_eur_pp.toLocaleString("fr-FR")} EUR / pers.`;
}
