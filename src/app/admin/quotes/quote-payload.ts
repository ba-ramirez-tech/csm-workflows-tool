import { TravelerType, TripTier } from "@prisma/client";
import { z } from "zod";

const itemTypes = ["accommodation", "experience", "transport", "meal", "free_time"] as const;

const nullableIso = z
  .string()
  .nullable()
  .transform((s) => {
    if (s == null || s === "") return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : s;
  });

export const quoteEditorItemSchema = z.object({
  clientKey: z.string().min(1),
  sortOrder: z.number().int().min(0),
  itemType: z.enum(itemTypes),
  accommodationId: z.string().uuid().nullable(),
  experienceId: z.string().uuid().nullable(),
  transportId: z.string().uuid().nullable(),
  timeSlot: z.string().nullable(),
  startTime: z.string().nullable(),
  notesText: z.string(),
  isOptional: z.boolean(),
  description: z.string(),
  isManualPricing: z.boolean(),
  manualLineTotalClient: z.number().int().min(0).nullable(),
});

export const quoteEditorDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  destinationId: z.string().uuid(),
  items: z.array(quoteEditorItemSchema),
});

export const quoteEditorPayloadSchema = z.object({
  name: z.string().trim().min(1),
  marginPct: z.number().min(0).max(200),
  currency: z.enum(["EUR", "USD", "COP"]),
  validUntil: nullableIso,
  travelStartDate: nullableIso,
  travelEndDate: nullableIso,
  durationDays: z.number().int().min(1).max(365),
  numTravelers: z.number().int().min(1).max(99),
  travelerType: z.nativeEnum(TravelerType).nullable(),
  tier: z.nativeEnum(TripTier).nullable(),
  included: z.unknown().nullable(),
  notIncluded: z.unknown().nullable(),
  days: z.array(quoteEditorDaySchema).min(1),
});

export type QuoteEditorPayload = z.infer<typeof quoteEditorPayloadSchema>;

const travelerIn = z
  .string()
  .optional()
  .nullable()
  .transform((v): TravelerType | null => {
    if (v == null || v === "") return null;
    return Object.values(TravelerType).includes(v as TravelerType) ? (v as TravelerType) : null;
  });

const tierIn = z
  .string()
  .optional()
  .nullable()
  .transform((v): TripTier | null => {
    if (v == null || v === "") return null;
    return Object.values(TripTier).includes(v as TripTier) ? (v as TripTier) : null;
  });

export const createQuoteFormSchema = z.object({
  clientId: z.string().uuid(),
  mode: z.enum(["template", "scratch"]),
  templateId: z.string().uuid().nullable(),
  name: z.string().trim().min(1),
  durationDays: z.number().int().min(1).max(365),
  numTravelers: z.number().int().min(1).max(99),
  travelerType: travelerIn,
  tier: tierIn,
  currency: z.enum(["EUR", "USD", "COP"]),
});

export type CreateQuoteFormInput = z.infer<typeof createQuoteFormSchema>;
