import { z } from "zod";

const tierEnum = z.enum(["BUDGET", "STANDARD", "CHARME", "LUXURY"]);

const itineraryDayGlanceSchema = z.object({
  day_number: z.coerce.number().int().min(1).max(60),
  title: z.string().min(1),
  area: z.string().min(1),
});

const dayProgramSchema = z.object({
  day_number: z.coerce.number().int().min(1).max(60),
  title: z.string().min(1),
  narrative: z.string().min(1),
  suggested_lodging: z.string().nullable().optional(),
});

const lodgingHighlightSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  summary: z.string().min(1),
});

export const aiProposalItemSchema = z
  .object({
    proposal_name: z.string().min(1),
    tagline: z.string().min(1),
    recommended_template: z.string().min(1),
    recommended_template_id: z.string().uuid().nullable().optional(),
    duration_days: z.coerce.number().int().min(3).max(60),
    tier: tierEnum,
    /** Long-form intro (Présentation-style): story, tone, promise — several sentences or short paragraphs. */
    presentation: z.string().min(1),
    why_this_fits: z.string().min(1),
    /** One row per calendar day — scannable “itinéraire en bref”. */
    itinerary_at_a_glance: z.array(itineraryDayGlanceSchema),
    /** One block per day — programme détaillé (BeeTrip-style depth). */
    days_program: z.array(dayProgramSchema),
    /** 3–6 cross-cutting themes (not a duplicate of per-day lines). */
    day_highlights: z.array(z.string()).min(1).max(8),
    /** 0–4 property blurbs; optional for very budget proposals. */
    lodging_highlights: z.array(lodgingHighlightSchema).max(4).default([]),
    estimated_price_range: z.object({
      low_eur_pp: z.coerce.number().nonnegative(),
      high_eur_pp: z.coerce.number().nonnegative(),
    }),
    differentiator: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const n = data.duration_days;
    if (data.itinerary_at_a_glance.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `itinerary_at_a_glance must have exactly ${n} entries (one per day).`,
        path: ["itinerary_at_a_glance"],
      });
    }
    if (data.days_program.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `days_program must have exactly ${n} entries (one per day).`,
        path: ["days_program"],
      });
    }
    const glanceDays = [...data.itinerary_at_a_glance]
      .map((d) => d.day_number)
      .sort((a, b) => a - b);
    const programDays = [...data.days_program]
      .map((d) => d.day_number)
      .sort((a, b) => a - b);
    const expected = Array.from({ length: n }, (_, i) => i + 1);
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
    if (!same(glanceDays, expected)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `itinerary_at_a_glance day_number must be 1 through ${n} exactly once each.`,
        path: ["itinerary_at_a_glance"],
      });
    }
    if (!same(programDays, expected)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `days_program day_number must be 1 through ${n} exactly once each.`,
        path: ["days_program"],
      });
    }
  });

export const aiProposalResponseSchema = z.object({
  proposals: z.array(aiProposalItemSchema).min(1).max(5),
});

export type AiProposalItem = z.infer<typeof aiProposalItemSchema>;
export type AiProposalResponse = z.infer<typeof aiProposalResponseSchema>;
