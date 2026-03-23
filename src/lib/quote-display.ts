import type { Prisma } from "@prisma/client";
import { clientAmountToCop, copToClientAmount } from "@/lib/exchange-rates";

export type QuoteItemWithRelations = {
  id: string;
  dayNumber: number;
  sortOrder: number;
  destinationId: string;
  itemType: string;
  accommodationId: string | null;
  experienceId: string | null;
  transportId: string | null;
  timeSlot: string | null;
  startTime: string | null;
  notes: Prisma.JsonValue | null;
  isOptional: boolean;
  description: string;
  netUnitCop: number | null;
  costPerWhat: string | null;
  quantity: number;
  subtotalNetCop: number | null;
  manualLineTotalClient: number | null;
  isManualPricing: boolean;
  accommodation?: { name: string } | null;
  experience?: { name: string } | null;
  transport?: { id: string } | null;
};

export function notesToText(notes: Prisma.JsonValue | null): string {
  if (notes == null) return "";
  if (typeof notes === "string") return notes;
  return "";
}

export function itemDisplayName(
  it: QuoteItemWithRelations,
  transportLabel?: string,
): string {
  if (it.description.trim()) return it.description;
  if (it.accommodation) return it.accommodation.name;
  if (it.experience) return it.experience.name;
  if (it.transport && transportLabel) return transportLabel;
  return it.itemType.replace("_", " ");
}

export function lineSellCop(
  it: QuoteItemWithRelations,
  marginPct: number,
  currency: string,
): number {
  const m = 1 + (marginPct ?? 20) / 100;
  if (it.isManualPricing || it.itemType === "meal" || it.itemType === "free_time") {
    return clientAmountToCop(it.manualLineTotalClient ?? 0, currency);
  }
  const net = it.subtotalNetCop ?? 0;
  return Math.round(net * m);
}

export function totalSellCopFromItems(
  items: QuoteItemWithRelations[],
  marginPct: number,
  currency: string,
): number {
  return items.reduce((acc, it) => acc + lineSellCop(it, marginPct, currency), 0);
}

export function formatJsonIncludedAsLines(value: Prisma.JsonValue | null): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");
  if (typeof value === "object" && value !== null && "fr" in value) {
    const fr = (value as { fr?: unknown }).fr;
    if (Array.isArray(fr)) return fr.map(String).join("\n");
    if (typeof fr === "string") return fr;
  }
  return "";
}

export function linesToIncludedJson(text: string): Prisma.InputJsonValue {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { fr: lines };
}

export { copToClientAmount };
