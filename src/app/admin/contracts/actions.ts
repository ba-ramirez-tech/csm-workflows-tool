"use server";

import { Prisma, Season } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ContractFormState = {
  message?: string;
  errors?: Record<string, string>;
};

const SUPPLIER_TYPES = ["accommodation", "experience", "transport"] as const;
const COST_PER = ["per_night", "per_person", "per_group", "per_vehicle"] as const;

const perkSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  conditions: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().optional(),
  ),
});

const conditionPairSchema = z.object({
  key: z.string().trim().min(1, "Key is required."),
  value: z.string().trim().min(1, "Value is required."),
});

function parseJsonField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function normalizePerks(raw: unknown): z.infer<typeof perkSchema>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
    .map((row) => ({
      description: String(row.description ?? "").trim(),
      conditions: String(row.conditions ?? "").trim(),
    }))
    .filter((r) => r.description.length > 0);
}

function normalizeConditionPairs(raw: unknown): z.infer<typeof conditionPairSchema>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
    .map((row) => ({
      key: String(row.key ?? "").trim(),
      value: String(row.value ?? "").trim(),
    }))
    .filter((r) => r.key.length > 0 && r.value.length > 0);
}

function pairsToConditionsJson(pairs: z.infer<typeof conditionPairSchema>[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (pairs.length === 0) return Prisma.JsonNull;
  const obj: Record<string, string> = {};
  for (const p of pairs) {
    obj[p.key] = p.value;
  }
  return obj;
}

function perksToJson(perks: z.infer<typeof perkSchema>[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (perks.length === 0) return Prisma.JsonNull;
  return perks.map((p) => {
    const row: { description: string; conditions?: string } = { description: p.description };
    const c = p.conditions?.trim();
    if (c && c.length > 0) row.conditions = c;
    return row;
  });
}

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const createContractSchema = z
  .object({
    supplierType: z.enum(SUPPLIER_TYPES),
    accommodationId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    experienceId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    transportId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    season: z.nativeEnum(Season),
    netCostCop: z.coerce.number().int().min(1, "Net cost must be at least 1 COP."),
    costPerWhat: z.enum(COST_PER),
    currency: z.string().trim().min(1).default("COP"),
    validFrom: z.string().min(1, "Valid from is required."),
    validTo: z.string().min(1, "Valid to is required."),
    commissionPct: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.coerce.number().min(0).max(100).optional(),
    ),
    notes: z.string().optional(),
    perks: z.array(perkSchema),
    conditionPairs: z.array(conditionPairSchema),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const acc = data.accommodationId;
    const exp = data.experienceId;
    const tr = data.transportId;
    if (data.supplierType === "accommodation") {
      if (!acc) ctx.addIssue({ code: "custom", message: "Select an accommodation.", path: ["accommodationId"] });
    } else if (data.supplierType === "experience") {
      if (!exp) ctx.addIssue({ code: "custom", message: "Select an experience.", path: ["experienceId"] });
    } else {
      if (!tr) ctx.addIssue({ code: "custom", message: "Select a transport route.", path: ["transportId"] });
    }
    const from = new Date(data.validFrom);
    const to = new Date(data.validTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
      ctx.addIssue({ code: "custom", message: "Valid to must be on or after valid from.", path: ["validTo"] });
    }
  });

const updateContractSchema = z
  .object({
    season: z.nativeEnum(Season),
    netCostCop: z.coerce.number().int().min(1, "Net cost must be at least 1 COP."),
    costPerWhat: z.enum(COST_PER),
    currency: z.string().trim().min(1).default("COP"),
    validFrom: z.string().min(1, "Valid from is required."),
    validTo: z.string().min(1, "Valid to is required."),
    commissionPct: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.coerce.number().min(0).max(100).optional(),
    ),
    notes: z.string().optional(),
    perks: z.array(perkSchema),
    conditionPairs: z.array(conditionPairSchema),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.validFrom);
    const to = new Date(data.validTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
      ctx.addIssue({ code: "custom", message: "Valid to must be on or after valid from.", path: ["validTo"] });
    }
  });

function mapValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out = Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs[0])
      .map(([key, msgs]) => [key, msgs![0] ?? "Invalid value."]),
  );
  for (const issue of error.issues) {
    if (issue.path.length && issue.message && typeof issue.path[0] === "string") {
      const k = issue.path.join(".");
      if (!out[k]) out[k] = issue.message;
    }
  }
  return out;
}

function parseCreateForm(formData: FormData) {
  const perksRaw = parseJsonField(formData.get("negotiatedPerksJson"));
  const condRaw = parseJsonField(formData.get("conditionsJson"));
  if (perksRaw === undefined || condRaw === undefined) {
    return { success: false as const, errors: { form: "Invalid JSON in perks or conditions." } };
  }

  const perksNorm = normalizePerks(perksRaw);
  const condNorm = normalizeConditionPairs(condRaw);

  const perksParsed = z.array(perkSchema).safeParse(perksNorm);
  if (!perksParsed.success) {
    return { success: false as const, errors: mapValidationErrors(perksParsed.error) };
  }

  const condParsed = z.array(conditionPairSchema).safeParse(condNorm);
  if (!condParsed.success) {
    return { success: false as const, errors: mapValidationErrors(condParsed.error) };
  }

  const payload = {
    supplierType: formData.get("supplierType"),
    accommodationId: (formData.get("accommodationId") as string | null) ?? "",
    experienceId: (formData.get("experienceId") as string | null) ?? "",
    transportId: (formData.get("transportId") as string | null) ?? "",
    season: formData.get("season"),
    netCostCop: formData.get("netCostCop"),
    costPerWhat: formData.get("costPerWhat"),
    currency: (formData.get("currency") as string | null) ?? "COP",
    validFrom: (formData.get("validFrom") as string | null) ?? "",
    validTo: (formData.get("validTo") as string | null) ?? "",
    commissionPct: formData.get("commissionPct"),
    notes: (formData.get("notes") as string | null) ?? "",
    perks: perksParsed.data,
    conditionPairs: condParsed.data,
    isActive: formData.get("isActive") === "on",
  };

  const parsed = createContractSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, errors: mapValidationErrors(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

function parseUpdateForm(formData: FormData) {
  const perksRaw = parseJsonField(formData.get("negotiatedPerksJson"));
  const condRaw = parseJsonField(formData.get("conditionsJson"));
  if (perksRaw === undefined || condRaw === undefined) {
    return { success: false as const, errors: { form: "Invalid JSON in perks or conditions." } };
  }

  const perksNorm = normalizePerks(perksRaw);
  const condNorm = normalizeConditionPairs(condRaw);

  const perksParsed = z.array(perkSchema).safeParse(perksNorm);
  if (!perksParsed.success) {
    return { success: false as const, errors: mapValidationErrors(perksParsed.error) };
  }

  const condParsed = z.array(conditionPairSchema).safeParse(condNorm);
  if (!condParsed.success) {
    return { success: false as const, errors: mapValidationErrors(condParsed.error) };
  }

  const payload = {
    season: formData.get("season"),
    netCostCop: formData.get("netCostCop"),
    costPerWhat: formData.get("costPerWhat"),
    currency: (formData.get("currency") as string | null) ?? "COP",
    validFrom: (formData.get("validFrom") as string | null) ?? "",
    validTo: (formData.get("validTo") as string | null) ?? "",
    commissionPct: formData.get("commissionPct"),
    notes: (formData.get("notes") as string | null) ?? "",
    perks: perksParsed.data,
    conditionPairs: condParsed.data,
    isActive: formData.get("isActive") === "on",
  };

  const parsed = updateContractSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, errors: mapValidationErrors(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

export async function createContractAction(
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  requireRole("SUPER_ADMIN");

  const parsed = parseCreateForm(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const d = parsed.data;
  const validFrom = new Date(d.validFrom);
  const validTo = new Date(d.validTo);

  try {
    await prisma.contract.create({
      data: {
        supplierType: d.supplierType,
        accommodationId: d.supplierType === "accommodation" ? d.accommodationId! : null,
        experienceId: d.supplierType === "experience" ? d.experienceId! : null,
        transportId: d.supplierType === "transport" ? d.transportId! : null,
        season: d.season,
        netCostCop: d.netCostCop,
        costPerWhat: d.costPerWhat,
        currency: d.currency.trim(),
        validFrom,
        validTo,
        commissionPct: d.commissionPct ?? null,
        notes: d.notes?.trim() || null,
        negotiatedPerks: perksToJson(d.perks),
        conditions: pairsToConditionsJson(d.conditionPairs),
        isActive: d.isActive,
      },
    });
  } catch {
    return { message: "Unable to create contract. Please try again." };
  }

  redirect("/admin/contracts?message=Contract%20created");
}

export async function updateContractAction(
  id: string,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  requireRole("SUPER_ADMIN");

  const parsed = parseUpdateForm(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const d = parsed.data;
  const validFrom = new Date(d.validFrom);
  const validTo = new Date(d.validTo);

  try {
    await prisma.contract.update({
      where: { id },
      data: {
        season: d.season,
        netCostCop: d.netCostCop,
        costPerWhat: d.costPerWhat,
        currency: d.currency.trim(),
        validFrom,
        validTo,
        commissionPct: d.commissionPct ?? null,
        notes: d.notes?.trim() || null,
        negotiatedPerks: perksToJson(d.perks),
        conditions: pairsToConditionsJson(d.conditionPairs),
        isActive: d.isActive,
      },
    });
  } catch {
    return { message: "Unable to update contract. Please try again." };
  }

  redirect("/admin/contracts?message=Contract%20updated");
}

export async function deleteContractAction(id: string) {
  requireRole("SUPER_ADMIN");
  await prisma.contract.delete({ where: { id } });
  redirect("/admin/contracts?message=Contract%20deleted");
}
