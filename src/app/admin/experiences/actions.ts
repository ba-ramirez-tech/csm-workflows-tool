"use server";

import { DifficultyLevel, ExperienceStyle, Prisma, TransportMode } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type ExperienceFormState = {
  message?: string;
  errors?: Record<string, string>;
};

const CATEGORIES = ["city_tour", "nature", "cultural", "gastronomic", "adventure", "wellness"] as const;

const LANGUAGE_CODES = ["fr", "en", "es", "de"] as const;

function parseJsonArrayField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
}

const experienceSchema = z.object({
  destinationId: z.string().uuid("Select a destination."),
  name: z.string().trim().min(1, "Name is required."),
  category: z.enum(CATEGORIES),
  activityStyle: z.nativeEnum(ExperienceStyle),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  difficulty: z.nativeEnum(DifficultyLevel),
  description: z.string().optional(),
  languages: z.array(z.enum(LANGUAGE_CODES)).min(1, "Select at least one language."),
  transportIncluded: z
    .union([z.nativeEnum(TransportMode), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  minPax: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  maxPax: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  meetingPoint: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z
    .string()
    .trim()
    .refine((s) => s === "" || z.string().email().safeParse(s).success, { message: "Invalid email." }),
  notes: z.string().optional(),
  highlights: z.array(z.string().trim().min(1)),
  included: z.array(z.string().trim().min(1)),
  notIncluded: z.array(z.string().trim().min(1)),
  whatToBring: z.array(z.string().trim().min(1)),
  isActive: z.boolean(),
});

function parseExperienceFormData(formData: FormData) {
  const highlightsRaw = parseJsonArrayField(formData.get("highlightsJson"));
  const includedRaw = parseJsonArrayField(formData.get("includedJson"));
  const notIncludedRaw = parseJsonArrayField(formData.get("notIncludedJson"));
  const whatToBringRaw = parseJsonArrayField(formData.get("whatToBringJson"));

  if (highlightsRaw === null || includedRaw === null || notIncludedRaw === null || whatToBringRaw === null) {
    return { success: false as const, errors: { form: "Invalid list data." } };
  }

  const emailRaw = formData.get("contactEmail");

  const languagesRaw = formData.getAll("languages");
  const languagesFiltered = languagesRaw.filter((l): l is (typeof LANGUAGE_CODES)[number] =>
    (LANGUAGE_CODES as readonly string[]).includes(String(l)),
  );

  const payload = {
    destinationId: formData.get("destinationId"),
    name: formData.get("name"),
    category: formData.get("category"),
    activityStyle: formData.get("activityStyle"),
    durationMinutes: formData.get("durationMinutes"),
    difficulty: formData.get("difficulty"),
    description: (formData.get("description") as string | null) ?? "",
    languages: languagesFiltered,
    transportIncluded: (formData.get("transportIncluded") as string | null) ?? "",
    minPax: formData.get("minPax"),
    maxPax: formData.get("maxPax"),
    meetingPoint: (formData.get("meetingPoint") as string | null) ?? "",
    contactName: (formData.get("contactName") as string | null) ?? "",
    contactPhone: (formData.get("contactPhone") as string | null) ?? "",
    contactEmail: typeof emailRaw === "string" ? emailRaw : "",
    notes: (formData.get("notes") as string | null) ?? "",
    highlights: normalizeStringList(highlightsRaw),
    included: normalizeStringList(includedRaw),
    notIncluded: normalizeStringList(notIncludedRaw),
    whatToBring: normalizeStringList(whatToBringRaw),
    isActive: formData.get("isActive") === "on",
  };

  const parsed = experienceSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, errors: mapValidationErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.maxPax != null && data.minPax != null && data.maxPax < data.minPax) {
    return {
      success: false as const,
      errors: { maxPax: "Max pax must be greater than or equal to min pax." },
    };
  }

  return { success: true as const, data };
}

function mapValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs[0])
      .map(([key, msgs]) => [key, msgs![0] ?? "Invalid value."]),
  );
}

function toDescriptionJson(value: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const trimmed = value.trim();
  if (!trimmed) return Prisma.JsonNull;
  return trimmed;
}

function toJsonStringList(items: string[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (items.length === 0) return Prisma.JsonNull;
  return items;
}

export async function createExperienceAction(
  _prevState: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const parsed = parseExperienceFormData(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const data = parsed.data;

  try {
    await prisma.experience.create({
      data: {
        destinationId: data.destinationId,
        name: data.name,
        category: data.category,
        activityStyle: data.activityStyle,
        durationMinutes: data.durationMinutes,
        difficulty: data.difficulty,
        description: toDescriptionJson(data.description ?? ""),
        highlights: toJsonStringList(data.highlights),
        included: toJsonStringList(data.included),
        notIncluded: toJsonStringList(data.notIncluded),
        whatToBring: toJsonStringList(data.whatToBring),
        languages: data.languages,
        transportIncluded: data.transportIncluded,
        minPax: data.minPax ?? 1,
        maxPax: data.maxPax,
        meetingPoint: data.meetingPoint?.trim() || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        notes: data.notes?.trim() || null,
        photoGallery: [],
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to create experience. Please try again." };
  }

  redirect("/admin/experiences?message=Experience%20created");
}

export async function updateExperienceAction(
  id: string,
  _prevState: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const parsed = parseExperienceFormData(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const data = parsed.data;

  try {
    await prisma.experience.update({
      where: { id },
      data: {
        destinationId: data.destinationId,
        name: data.name,
        category: data.category,
        activityStyle: data.activityStyle,
        durationMinutes: data.durationMinutes,
        difficulty: data.difficulty,
        description: toDescriptionJson(data.description ?? ""),
        highlights: toJsonStringList(data.highlights),
        included: toJsonStringList(data.included),
        notIncluded: toJsonStringList(data.notIncluded),
        whatToBring: toJsonStringList(data.whatToBring),
        languages: data.languages,
        transportIncluded: data.transportIncluded,
        minPax: data.minPax ?? 1,
        maxPax: data.maxPax,
        meetingPoint: data.meetingPoint?.trim() || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to update experience. Please try again." };
  }

  redirect("/admin/experiences?message=Experience%20updated");
}

export async function deleteExperienceAction(id: string) {
  await prisma.experience.delete({ where: { id } });
  redirect("/admin/experiences?message=Experience%20deleted");
}
