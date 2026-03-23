import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { formatClientPrice } from "@/lib/client-currency";
import { copToClientAmount } from "@/lib/exchange-rates";
import { itemDisplayName, formatJsonIncludedAsLines, type QuoteItemWithRelations } from "@/lib/quote-display";
import { prisma } from "@/lib/prisma";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function linesFromJson(value: Prisma.JsonValue | null): string[] {
  const t = formatJsonIncludedAsLines(value);
  return t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export default async function QuotePrintPage({ params }: Props) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
        include: {
          destination: { select: { name: true } },
          accommodation: { select: { name: true } },
          experience: { select: { name: true } },
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

  const byDay = new Map<number, typeof quote.items>();
  for (const it of quote.items) {
    if (!byDay.has(it.dayNumber)) byDay.set(it.dayNumber, []);
    byDay.get(it.dayNumber)!.push(it);
  }

  const totalCop = quote.totalPriceCop ?? 0;
  const totalClient = copToClientAmount(totalCop, quote.currency);

  return (
    <div className="quote-print mx-auto max-w-3xl bg-white px-6 py-10 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar />
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">Colombie Sur Mesure</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{quote.name ?? "Travel proposal"}</h1>
            <p className="mt-1 text-sm text-slate-600">Prepared for {quote.client.name}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>{format(new Date(), "d MMMM yyyy")}</div>
            {quote.validUntil ? (
              <div className="mt-1 font-medium text-slate-900">
                Valid until {format(quote.validUntil, "d MMMM yyyy")}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Itinerary</h2>
        <div className="mt-4 space-y-8">
          {Array.from({ length: quote.durationDays }, (_, i) => i + 1).map((dayNum) => {
            const items = byDay.get(dayNum) ?? [];
            const destName = items[0]?.destination?.name ?? "—";
            return (
              <div key={dayNum} className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-teal-900">
                  Day {dayNum} — {destName}
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {items.length === 0 ? (
                    <li className="text-slate-500">Details on request.</li>
                  ) : (
                    items.map((it) => {
                      const trLabel = it.transport
                        ? `${it.transport.origin.name} → ${it.transport.destination.name}`
                        : undefined;
                      const row: QuoteItemWithRelations = {
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
                        transport: it.transport ? { id: it.transport.id } : null,
                      };
                      const label = itemDisplayName(row, trLabel);
                      return (
                        <li key={it.id}>
                          <span className="font-medium capitalize">{it.itemType.replace("_", " ")}:</span> {label}
                          {it.isOptional ? (
                            <span className="text-slate-500"> (optional)</span>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Included</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {linesFromJson(quote.included).length > 0 ? (
              linesFromJson(quote.included).map((line) => <li key={line}>{line}</li>)
            ) : (
              <li className="text-slate-500">As per proposal — details in your quote letter.</li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Not included</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {linesFromJson(quote.notIncluded).length > 0 ? (
              linesFromJson(quote.notIncluded).map((line) => <li key={line}>{line}</li>)
            ) : (
              <li className="text-slate-500">International flights, personal expenses, tips unless stated.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-10 rounded-xl border-2 border-teal-700 bg-teal-50/50 px-6 py-6 text-center print:border-teal-900 print:bg-white">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-900">Total price</p>
        <p className="mt-2 text-4xl font-bold text-teal-950">{formatClientPrice(totalClient, quote.currency)}</p>
        <p className="mt-2 text-sm text-slate-600">
          For {quote.numTravelers} traveler{quote.numTravelers > 1 ? "s" : ""} · {quote.durationDays} days
        </p>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Next steps</p>
        <p className="mt-2">
          Reply to confirm this itinerary or request adjustments. We will hold availability briefly once you are ready
          to proceed.
        </p>
        <p className="mt-4">
          <span className="font-medium text-slate-900">Contact:</span> your concierge team · We respond within one
          business day.
        </p>
        <p className="mt-6 print:hidden">
          <Link href={`/admin/quotes/${quote.id}`} className="text-teal-800 underline">
            Back to editor
          </Link>
        </p>
      </footer>
    </div>
  );
}
