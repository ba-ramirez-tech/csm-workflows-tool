"use server";

import { Prisma, TravelerType, TripTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseClientCurrency } from "@/lib/client-currency";
import { prisma } from "@/lib/prisma";
import { getQuickStartFormula } from "@/lib/quick-start-formulas";
import { slugify } from "@/lib/slug";

export type TemplateMetadataFormState = {
  message?: string;
  errors?: Record<string, string>;
  ok?: boolean;
};

export type TemplateBuilderSaveState = {
  message?: string;
  errors?: Record<string, string>;
  ok?: boolean;
};

const TRAVELER_TYPES = Object.values(TravelerType);
const TRIP_TIERS = Object.values(TripTier);
const ITEM_TYPES = ["accommodation", "experience", "transport", "meal", "free_time"] as const;
const TIME_SLOTS = ["morning", "afternoon", "evening", "full_day"] as const;

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  while (true) {
    const exists = await prisma.tripTemplate.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

const builderItemSchema = z
  .object({
    sortOrder: z.number().int().min(0),
    itemType: z.enum(ITEM_TYPES),
    accommodationId: z.string().uuid().nullable().optional(),
    experienceId: z.string().uuid().nullable().optional(),
    transportId: z.string().uuid().nullable().optional(),
    timeSlot: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.enum(TIME_SLOTS).nullable().optional(),
    ),
    startTime: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.string().nullable().optional(),
    ),
    isOptional: z.boolean(),
    notesText: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemType === "accommodation") {
      if (!data.accommodationId) {
        ctx.addIssue({ code: "custom", message: "Select an accommodation.", path: ["accommodationId"] });
      }
    } else if (data.itemType === "experience") {
      if (!data.experienceId) {
        ctx.addIssue({ code: "custom", message: "Select an experience.", path: ["experienceId"] });
      }
    } else if (data.itemType === "transport") {
      if (!data.transportId) {
        ctx.addIssue({ code: "custom", message: "Select a route.", path: ["transportId"] });
      }
    }
  });

const builderDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  destinationId: z.string().uuid("Each day must have a destination."),
  title: z.string(),
  items: z.array(builderItemSchema),
});

const fullSavePayloadSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  travelerTypes: z.array(z.nativeEnum(TravelerType)).min(1),
  tier: z.nativeEnum(TripTier),
  durationDays: z.number().int().min(1).max(365),
  description: z.string(),
  basePriceAmount: z.preprocess(
    (v) => (v === null || v === undefined ? null : v),
    z.union([z.number().int().min(0), z.null()]).optional(),
  ),
  clientCurrency: z.string().min(1).max(16),
  webProductUrl: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.union([z.string().url(), z.null()]).optional(),
  ),
  tags: z.array(z.string().min(1).max(80)).max(60).optional(),
  isPublished: z.boolean(),
  isActive: z.boolean(),
  days: z.array(builderDaySchema).min(1),
});

function toJsonText(value: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const t = value.trim();
  if (!t) return Prisma.JsonNull;
  return t;
}

function itemNotesJson(text: string | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const t = (text ?? "").trim();
  if (!t) return Prisma.JsonNull;
  return t;
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 60);
}

function normalizeWebProductUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const ok = z.string().url().safeParse(s);
  return ok.success ? s : null;
}

export async function createTripTemplateAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const travelerTypes = formData.getAll("travelerTypes").filter((t): t is TravelerType =>
    TRAVELER_TYPES.includes(t as TravelerType),
  );
  const tier = formData.get("tier") as TripTier;
  const durationDays = Number(formData.get("durationDays"));
  const description = String(formData.get("description") ?? "");
  const basePriceRaw = formData.get("basePriceAmount");
  const clientCurrency = parseClientCurrency(String(formData.get("clientCurrency") ?? ""));
  const webProductUrlRaw = String(formData.get("webProductUrl") ?? "");
  const tags = parseTagsInput(String(formData.get("tags") ?? ""));

  if (!name) {
    redirect("/admin/templates/new?error=" + encodeURIComponent("Name is required."));
  }
  if (travelerTypes.length === 0) {
    redirect("/admin/templates/new?error=" + encodeURIComponent("Select at least one traveler profile."));
  }
  if (!TRIP_TIERS.includes(tier as TripTier)) {
    redirect("/admin/templates/new?error=" + encodeURIComponent("Invalid tier."));
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 365) {
    redirect("/admin/templates/new?error=" + encodeURIComponent("Duration must be 1–365 days."));
  }

  if (!slug) slug = slugify(name);
  slug = await uniqueSlug(slugify(slug));

  const basePriceAmount =
    typeof basePriceRaw === "string" && basePriceRaw.trim() !== ""
      ? Math.max(0, Math.trunc(Number(basePriceRaw)))
      : null;

  const webProductUrl = normalizeWebProductUrl(webProductUrlRaw);

  const firstDest = await prisma.destination.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  if (!firstDest) {
    redirect("/admin/templates/new?error=" + encodeURIComponent("Create at least one destination first."));
  }

  const template = await prisma.tripTemplate.create({
    data: {
      name,
      slug,
      travelerTypes,
      tier: tier as TripTier,
      durationDays: Math.trunc(durationDays),
      description: toJsonText(description),
      basePriceAmount: basePriceAmount ?? undefined,
      clientCurrency,
      webProductUrl: webProductUrl ?? undefined,
      tags,
      isPublished: false,
      isActive: true,
      days: {
        create: Array.from({ length: Math.trunc(durationDays) }, (_, i) => ({
          dayNumber: i + 1,
          destinationId: firstDest.id,
        })),
      },
    },
    select: { id: true },
  });

  redirect(`/admin/templates/${template.id}`);
}

export async function saveTemplateMetadataAction(
  templateId: string,
  _prev: TemplateMetadataFormState,
  formData: FormData,
): Promise<TemplateMetadataFormState> {
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const travelerTypes = formData.getAll("travelerTypes").filter((t): t is TravelerType =>
    TRAVELER_TYPES.includes(t as TravelerType),
  );
  const tierRaw = formData.get("tier");
  const durationDays = Number(formData.get("durationDays"));
  const description = String(formData.get("description") ?? "");
  const basePriceRaw = formData.get("basePriceAmount");
  const clientCurrency = parseClientCurrency(String(formData.get("clientCurrency") ?? ""));
  const webProductUrlRaw = String(formData.get("webProductUrl") ?? "");
  const tags = parseTagsInput(String(formData.get("tags") ?? ""));
  const isPublished = formData.get("isPublished") === "on";
  const isActive = formData.get("isActive") === "on";

  if (!name) return { message: "Name is required.", errors: { name: "Required." } };
  if (travelerTypes.length === 0) {
    return { message: "Select at least one traveler profile.", errors: { travelerTypes: "Required." } };
  }
  if (!TRIP_TIERS.includes(tierRaw as TripTier)) {
    return { message: "Invalid tier.", errors: { tier: "Invalid." } };
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 365) {
    return { message: "Invalid duration.", errors: { durationDays: "1–365." } };
  }

  if (!slug) slug = slugify(name);

  const existing = await prisma.tripTemplate.findUnique({
    where: { id: templateId },
    select: { slug: true, durationDays: true },
  });
  if (!existing) return { message: "Template not found." };

  let finalSlug = slugify(slug);
  if (finalSlug !== existing.slug) {
    const taken = await prisma.tripTemplate.findFirst({
      where: { slug: finalSlug, NOT: { id: templateId } },
      select: { id: true },
    });
    if (taken) {
      finalSlug = await uniqueSlug(finalSlug);
    }
  }

  const basePriceAmount =
    typeof basePriceRaw === "string" && basePriceRaw.trim() !== ""
      ? Math.max(0, Math.trunc(Number(basePriceRaw)))
      : null;

  const webProductUrl = normalizeWebProductUrl(webProductUrlRaw);

  const newDuration = Math.trunc(durationDays);
  const oldDuration = existing.durationDays;

  const firstDay = await prisma.templateDay.findFirst({
    where: { templateId },
    orderBy: { dayNumber: "asc" },
    select: { destinationId: true },
  });
  const defaultDestId =
    firstDay?.destinationId ??
    (
      await prisma.destination.findFirst({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true },
      })
    )?.id;

  if (!defaultDestId) {
    return { message: "No destination available to extend template days." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tripTemplate.update({
        where: { id: templateId },
        data: {
          name,
          slug: finalSlug,
          travelerTypes,
          tier: tierRaw as TripTier,
          durationDays: newDuration,
          description: toJsonText(description),
          basePriceAmount,
          clientCurrency,
          webProductUrl,
          tags,
          isPublished,
          isActive,
        },
      });

      if (newDuration < oldDuration) {
        await tx.templateDay.deleteMany({
          where: { templateId, dayNumber: { gt: newDuration } },
        });
      } else if (newDuration > oldDuration) {
        for (let d = oldDuration + 1; d <= newDuration; d++) {
          await tx.templateDay.create({
            data: {
              templateId,
              dayNumber: d,
              destinationId: defaultDestId,
            },
          });
        }
      }
    });
  } catch {
    return { message: "Could not save metadata." };
  }

  return { ok: true, message: "Saved." };
}

export async function saveTemplateBuilderAction(
  templateId: string,
  _prev: TemplateBuilderSaveState,
  formData: FormData,
): Promise<TemplateBuilderSaveState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { message: "Missing payload." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    return { message: "Invalid JSON payload." };
  }

  const parsed = fullSavePayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    const first = Object.values(err.fieldErrors).flat()[0] ?? parsed.error.message;
    return { message: first, errors: { form: first } };
  }

  const p = parsed.data;

  if (p.days.length !== p.durationDays) {
    return { message: "Day count must match duration.", errors: { days: "Mismatch." } };
  }

  const nums = new Set(p.days.map((d) => d.dayNumber));
  for (let i = 1; i <= p.durationDays; i++) {
    if (!nums.has(i)) {
      return { message: `Missing day ${i}.`, errors: { days: `Missing day ${i}.` } };
    }
  }

  const existing = await prisma.tripTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!existing) return { message: "Template not found." };

  let slugFinal = slugify(p.slug);
  const curSlug = await prisma.tripTemplate.findUnique({ where: { id: templateId }, select: { slug: true } });
  if (curSlug && curSlug.slug !== slugFinal) {
    const taken = await prisma.tripTemplate.findFirst({
      where: { slug: slugFinal, NOT: { id: templateId } },
      select: { id: true },
    });
    if (taken) slugFinal = await uniqueSlug(slugFinal);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tripTemplate.update({
        where: { id: templateId },
        data: {
          name: p.name,
          slug: slugFinal,
          travelerTypes: p.travelerTypes,
          tier: p.tier,
          durationDays: p.durationDays,
          description: toJsonText(p.description),
          basePriceAmount: p.basePriceAmount ?? null,
          clientCurrency: p.clientCurrency,
          webProductUrl: p.webProductUrl ?? null,
          tags: p.tags ?? [],
          isPublished: p.isPublished,
          isActive: p.isActive,
        },
      });

      await tx.templateDay.deleteMany({ where: { templateId } });

      for (const day of [...p.days].sort((a, b) => a.dayNumber - b.dayNumber)) {
        await tx.templateDay.create({
          data: {
            templateId,
            dayNumber: day.dayNumber,
            destinationId: day.destinationId,
            title: toJsonText(day.title),
            items: {
              create: [...day.items]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((it, idx) => ({
                  sortOrder: it.sortOrder ?? idx,
                  itemType: it.itemType,
                  accommodationId: it.itemType === "accommodation" ? it.accommodationId! : null,
                  experienceId: it.itemType === "experience" ? it.experienceId! : null,
                  transportId: it.itemType === "transport" ? it.transportId! : null,
                  timeSlot: it.timeSlot ?? null,
                  startTime: it.startTime?.trim() || null,
                  isOptional: it.isOptional,
                  notes: itemNotesJson(it.notesText),
                })),
            },
          },
        });
      }
    });
  } catch (e) {
    console.error(e);
    return { message: "Save failed. Check slug uniqueness and references." };
  }

  return { ok: true, message: "Template saved." };
}

export async function cloneTripTemplateAction(templateId: string) {
  const original = await prisma.tripTemplate.findUnique({
    where: { id: templateId },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!original) {
    redirect("/admin/templates?error=" + encodeURIComponent("Template not found."));
  }

  const baseName = `${original.name} (Copy)`;
  const newSlug = await uniqueSlug(slugify(`${original.slug}-copy`));

  const created = await prisma.tripTemplate.create({
    data: {
      name: baseName,
      slug: newSlug,
      travelerTypes: original.travelerTypes,
      tier: original.tier,
      durationDays: original.durationDays,
      description: original.description ?? Prisma.JsonNull,
      highlights: original.highlights ?? Prisma.JsonNull,
      included: original.included ?? Prisma.JsonNull,
      notIncluded: original.notIncluded ?? Prisma.JsonNull,
      whatToBring: original.whatToBring ?? Prisma.JsonNull,
      basePriceAmount: original.basePriceAmount,
      clientCurrency: original.clientCurrency,
      webProductUrl: original.webProductUrl,
      tags: original.tags,
      photoUrl: original.photoUrl,
      isPublished: false,
      isActive: true,
      days: {
        create: original.days.map((d) => ({
          dayNumber: d.dayNumber,
          destinationId: d.destinationId,
          title: d.title ?? Prisma.JsonNull,
          description: d.description ?? Prisma.JsonNull,
          notes: d.notes,
          items: {
            create: d.items.map((it) => ({
              sortOrder: it.sortOrder,
              itemType: it.itemType,
              accommodationId: it.accommodationId,
              experienceId: it.experienceId,
              transportId: it.transportId,
              timeSlot: it.timeSlot,
              startTime: it.startTime,
              notes: it.notes ?? Prisma.JsonNull,
              isOptional: it.isOptional,
            })),
          },
        })),
      },
    },
    select: { id: true },
  });

  redirect(`/admin/templates/${created.id}?message=` + encodeURIComponent("Template cloned."));
}

export async function deleteTripTemplateAction(templateId: string) {
  await prisma.tripTemplate.delete({ where: { id: templateId } });
  redirect("/admin/templates?message=" + encodeURIComponent("Template deleted."));
}

export async function createQuickStartTemplateAction(formData: FormData) {
  const key = String(formData.get("formulaKey") ?? "").trim();
  const formula = getQuickStartFormula(key);
  if (!formula) {
    redirect("/admin/templates?error=" + encodeURIComponent("Unknown formula."));
  }

  const firstDest = await prisma.destination.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  if (!firstDest) {
    redirect("/admin/templates?error=" + encodeURIComponent("Create at least one destination first."));
  }

  const name = formula.name;
  const slug = await uniqueSlug(slugify(`${slugify(name)}-${formula.durationDays}d`));
  const travelerTypes: TravelerType[] = ["COUPLE", "FAMILY"];

  const template = await prisma.tripTemplate.create({
    data: {
      name,
      slug,
      travelerTypes,
      tier: TripTier.STANDARD,
      durationDays: formula.durationDays,
      description: toJsonText(formula.description),
      clientCurrency: "EUR",
      basePriceAmount: undefined,
      webProductUrl: formula.webProductUrl,
      tags: ["quick-start", formula.id],
      isPublished: false,
      isActive: true,
      days: {
        create: Array.from({ length: formula.durationDays }, (_, i) => ({
          dayNumber: i + 1,
          destinationId: firstDest.id,
        })),
      },
    },
    select: { id: true },
  });

  redirect(
    `/admin/templates/${template.id}?message=` +
      encodeURIComponent(`Started from “${name}”. Add destinations, hotels, and experiences for each day.`),
  );
}
