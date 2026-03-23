import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { parseIntakeFull } from "@/lib/admin/discovery-intake-fields";
import { formatJsonIncludedAsLines, notesToText, type QuoteItemWithRelations } from "@/lib/quote-display";
import { prisma } from "@/lib/prisma";
import type { QuoteDayState, QuoteItemState } from "../quote-editor-client";
import { QuoteEditorClient } from "../quote-editor-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function jsonToText(value: Prisma.JsonValue | null): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const lang of ["fr", "en", "es", "de"]) {
      const v = o[lang];
      if (typeof v === "string") return v;
    }
  }
  return "";
}

function mapDbItemToState(it: {
  id: string;
  sortOrder: number;
  itemType: string;
  accommodationId: string | null;
  experienceId: string | null;
  transportId: string | null;
  timeSlot: string | null;
  startTime: string | null;
  notes: Prisma.JsonValue | null;
  isOptional: boolean;
  description: string;
  isManualPricing: boolean;
  manualLineTotalClient: number | null;
}): QuoteItemState {
  return {
    serverId: it.id,
    clientKey: it.id,
    sortOrder: it.sortOrder,
    itemType: it.itemType,
    accommodationId: it.accommodationId,
    experienceId: it.experienceId,
    transportId: it.transportId,
    timeSlot: it.timeSlot,
    startTime: it.startTime ?? "",
    notesText: notesToText(it.notes),
    isOptional: it.isOptional,
    description: it.description,
    isManualPricing: it.isManualPricing,
    manualLineTotalClient: it.manualLineTotalClient,
  };
}

export default async function QuoteEditorPage({ params }: Props) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      template: { select: { id: true, name: true } },
      items: {
        orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
        include: {
          destination: { select: { id: true, name: true } },
          accommodation: { select: { id: true, name: true } },
          experience: { select: { id: true, name: true } },
          transport: {
            select: {
              id: true,
              origin: { select: { name: true } },
              destination: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!quote) notFound();

  const [intake, destinations, accommodations, experiences, transportRoutes] = await Promise.all([
    prisma.intakeResponse.findFirst({
      where: { clientId: quote.clientId },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.destination.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.accommodation.findMany({
      select: { id: true, name: true, destinationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.experience.findMany({
      select: { id: true, name: true, destinationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.transportRoute.findMany({
      include: {
        origin: { select: { name: true } },
        destination: { select: { name: true } },
      },
      orderBy: [{ origin: { name: "asc" } }, { destination: { name: "asc" } }],
    }),
  ]);

  const accommodationsByDest: Record<string, { id: string; name: string }[]> = {};
  for (const a of accommodations) {
    (accommodationsByDest[a.destinationId] ??= []).push({ id: a.id, name: a.name });
  }

  const experiencesByDest: Record<string, { id: string; name: string }[]> = {};
  for (const e of experiences) {
    (experiencesByDest[e.destinationId] ??= []).push({ id: e.id, name: e.name });
  }

  const transports = transportRoutes.map((r) => ({
    id: r.id,
    originId: r.originId,
    destinationId: r.destinationId,
    label: `${r.origin.name} → ${r.destination.name}`,
  }));

  const transportLabels: Record<string, string> = {};
  for (const r of transportRoutes) {
    transportLabels[r.id] = `${r.origin.name} → ${r.destination.name}`;
  }

  const byDay = new Map<number, typeof quote.items>();
  for (const it of quote.items) {
    if (!byDay.has(it.dayNumber)) byDay.set(it.dayNumber, []);
    byDay.get(it.dayNumber)!.push(it);
  }

  const defaultDest = destinations[0]?.id ?? "";
  const initialDays: QuoteDayState[] = [];
  for (let d = 1; d <= quote.durationDays; d++) {
    const list = byDay.get(d) ?? [];
    const destId = list[0]?.destinationId ?? quote.items.find((x) => x.dayNumber === d)?.destinationId ?? defaultDest;
    initialDays.push({
      dayNumber: d,
      destinationId: destId || defaultDest,
      items: list.map(mapDbItemToState),
    });
  }

  const parsed = intake?.fullResponse ? parseIntakeFull(intake.fullResponse) : null;
  const interests =
    parsed?.step2?.tripTypes?.slice(0, 5).join(", ") ||
    parsed?.step2?.regions?.slice(0, 3).join(", ") ||
    "—";
  const budget = parsed?.step3?.budgetBand ?? "—";
  const guide = quote.client.guideLanguage ?? parsed?.step1?.guideLanguage ?? "—";

  const itemsWithRelations: QuoteItemWithRelations[] = quote.items.map((it) => ({
    id: it.id,
    dayNumber: it.dayNumber,
    sortOrder: it.sortOrder,
    destinationId: it.destinationId,
    itemType: it.itemType,
    accommodationId: it.accommodationId,
    experienceId: it.experienceId,
    transportId: it.transportId,
    timeSlot: it.timeSlot,
    startTime: it.startTime,
    notes: it.notes,
    isOptional: it.isOptional,
    description: it.description,
    netUnitCop: it.netUnitCop,
    costPerWhat: it.costPerWhat,
    quantity: it.quantity,
    subtotalNetCop: it.subtotalNetCop,
    manualLineTotalClient: it.manualLineTotalClient,
    isManualPricing: it.isManualPricing,
    accommodation: it.accommodation,
    experience: it.experience,
    transport: it.transport
      ? { id: it.transport.id }
      : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/quotes" className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400">
          ← Quotes
        </Link>
        <span className="text-slate-400">|</span>
        <Link
          href={`/admin/clients/${quote.clientId}`}
          className="text-sm font-medium text-slate-700 hover:underline dark:text-gray-300"
        >
          Client: {quote.client.name}
        </Link>
      </div>

      <QuoteEditorClient
        quoteId={quote.id}
        quoteStatus={quote.status}
        initialMeta={{
          name: quote.name ?? "Untitled",
          marginPct: quote.marginPct ?? 20,
          currency: quote.currency,
          validUntil: quote.validUntil?.toISOString() ?? null,
          travelStartDate: quote.travelStartDate?.toISOString() ?? null,
          travelEndDate: quote.travelEndDate?.toISOString() ?? null,
          durationDays: quote.durationDays,
          numTravelers: quote.numTravelers,
          travelerType: quote.travelerType,
          tier: quote.tier,
          includedText: formatJsonIncludedAsLines(quote.included),
          notIncludedText: formatJsonIncludedAsLines(quote.notIncluded),
        }}
        initialDays={initialDays}
        client={{ id: quote.client.id, name: quote.client.name }}
        discoveryGlance={{ interests, budget, guide }}
        itemsWithRelations={itemsWithRelations}
        totalPriceCop={quote.totalPriceCop}
        destinations={destinations}
        accommodationsByDest={accommodationsByDest}
        experiencesByDest={experiencesByDest}
        transports={transports}
        transportLabels={transportLabels}
      />
    </div>
  );
}
