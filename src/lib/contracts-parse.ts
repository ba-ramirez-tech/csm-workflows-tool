import { Prisma } from "@prisma/client";

export type PerkRow = { description: string; conditions: string };
export type ConditionRow = { key: string; value: string };

export function parseNegotiatedPerksFromJson(value: Prisma.JsonValue | null): PerkRow[] {
  if (!value || !Array.isArray(value)) return [];
  const out: PerkRow[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const description = String(row.description ?? "").trim();
    const conditions = String(row.conditions ?? "").trim();
    if (description.length > 0 || conditions.length > 0) {
      out.push({ description, conditions });
    }
  }
  return out;
}

export function parseConditionsToPairs(value: Prisma.JsonValue | null): ConditionRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const o = value as Record<string, unknown>;
  return Object.entries(o).map(([key, val]) => ({
    key,
    value: typeof val === "string" ? val : val == null ? "" : JSON.stringify(val),
  }));
}
