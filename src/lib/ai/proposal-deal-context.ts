import { format } from "date-fns";

/** Format client bookings for the Anthropic user message (commercial / ops history). */
export function formatBookingsForPrompt(
  rows: Array<{
    dossierNumber: string;
    status: string;
    travelStart: Date;
    travelEnd: Date;
    numTravelers: number;
    totalPriceCop: number;
    currency: string;
  }>,
): string {
  if (rows.length === 0) return "(none)";
  return rows
    .map(
      (b) =>
        `- ${b.dossierNumber} | ${b.status} | ${format(b.travelStart, "yyyy-MM-dd")} → ${format(b.travelEnd, "yyyy-MM-dd")} | ${b.numTravelers} pax | ${b.totalPriceCop} ${b.currency}`,
    )
    .join("\n");
}

/** Format client quotes for the Anthropic user message (pipeline incl. unsuccessful). */
export function formatQuotesForPrompt(
  rows: Array<{
    name: string | null;
    status: string;
    durationDays: number;
    totalPriceCop: number | null;
    currency: string;
    updatedAt: Date;
  }>,
): string {
  if (rows.length === 0) return "(none)";
  return rows
    .map(
      (q) =>
        `- ${q.name ?? "Untitled"} | ${q.status} | ${q.durationDays}d | total ${q.totalPriceCop ?? "—"} ${q.currency} | updated ${format(q.updatedAt, "yyyy-MM-dd")}`,
    )
    .join("\n");
}

/** Format client-facing touchpoints for the Anthropic user message. */
export function formatTouchpointsForPrompt(
  rows: Array<{
    channel: string;
    category: string;
    direction: string;
    subject: string | null;
    summary: string | null;
    outcome: string | null;
    touchpointAt: Date;
  }>,
): string {
  if (rows.length === 0) return "(none)";
  return rows
    .map((t) => {
      const bits = [
        `channel=${t.channel}`,
        `category=${t.category}`,
        `direction=${t.direction}`,
        `date=${format(t.touchpointAt, "yyyy-MM-dd")}`,
      ];
      if (t.subject) bits.push(`subject: ${t.subject}`);
      if (t.summary) bits.push(`summary: ${t.summary}`);
      if (t.outcome) bits.push(`outcome: ${t.outcome}`);
      return `- ${bits.join(" | ")}`;
    })
    .join("\n");
}
