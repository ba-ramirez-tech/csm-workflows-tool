"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TravelerType, TripTier } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import {
  cloneQuoteAction,
  convertQuoteToBookingAction,
  markQuoteAcceptedAction,
  markQuoteRejectedAction,
  recalculateQuoteAction,
  saveQuoteDraftAction,
  sendQuoteToClientAction,
} from "./actions";
import type { QuoteEditorPayload } from "./quote-payload";
import {
  copToClientAmount,
  lineSellCop,
  linesToIncludedJson,
  totalSellCopFromItems,
  type QuoteItemWithRelations,
} from "@/lib/quote-display";
import { clientAmountToCop } from "@/lib/exchange-rates";
import { formatClientPrice } from "@/lib/client-currency";

export type QuoteItemState = {
  /** Persisted row id — matches itemsWithRelations after save/refresh. */
  serverId?: string | null;
  clientKey: string;
  sortOrder: number;
  itemType: string;
  accommodationId: string | null;
  experienceId: string | null;
  transportId: string | null;
  timeSlot: string | null;
  startTime: string | null;
  notesText: string;
  isOptional: boolean;
  description: string;
  isManualPricing: boolean;
  manualLineTotalClient: number | null;
};

export type QuoteDayState = {
  dayNumber: number;
  destinationId: string;
  items: QuoteItemState[];
};

type TransportOpt = { id: string; label: string; originId: string; destinationId: string };

type Props = {
  quoteId: string;
  quoteStatus: string;
  initialMeta: {
    name: string;
    marginPct: number;
    currency: string;
    validUntil: string | null;
    travelStartDate: string | null;
    travelEndDate: string | null;
    durationDays: number;
    numTravelers: number;
    travelerType: TravelerType | null;
    tier: TripTier | null;
    includedText: string;
    notIncludedText: string;
  };
  initialDays: QuoteDayState[];
  client: { id: string; name: string };
  discoveryGlance: { interests: string; budget: string; guide: string };
  itemsWithRelations: QuoteItemWithRelations[];
  totalPriceCop: number | null;
  destinations: { id: string; name: string }[];
  accommodationsByDest: Record<string, { id: string; name: string }[]>;
  experiencesByDest: Record<string, { id: string; name: string }[]>;
  transports: TransportOpt[];
  transportLabels: Record<string, string>;
};

const ITEM_TYPES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "experience", label: "Experience" },
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Meal" },
  { value: "free_time", label: "Free time" },
] as const;

const TRAVELERS: TravelerType[] = [
  "COUPLE",
  "FAMILY",
  "SOLO",
  "FRIENDS",
  "MICE",
  "PLUS_60",
  "HONEYMOON",
];
const TIERS: TripTier[] = ["BUDGET", "STANDARD", "CHARME", "LUXURY"];

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}`;
}

function emptyItem(sortOrder: number): QuoteItemState {
  return {
    serverId: null,
    clientKey: newKey(),
    sortOrder,
    itemType: "accommodation",
    accommodationId: null,
    experienceId: null,
    transportId: null,
    timeSlot: "morning",
    startTime: "",
    notesText: "",
    isOptional: false,
    description: "",
    isManualPricing: false,
    manualLineTotalClient: null,
  };
}

function filterTransportsForDay(transports: TransportOpt[], dayIndex: number, days: QuoteDayState[]): TransportOpt[] {
  const cur = days[dayIndex]?.destinationId;
  const prev = dayIndex > 0 ? days[dayIndex - 1]?.destinationId : null;
  if (!cur) return [];
  return transports.filter((t) => t.originId === cur || (prev != null && t.originId === prev));
}

export function QuoteEditorClient(props: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [meta, setMeta] = useState(props.initialMeta);
  const [days, setDays] = useState(props.initialDays);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const itemsForTotals = props.itemsWithRelations;

  const marginPct = meta.marginPct;
  const currency = meta.currency;

  const subtotalNetCop = useMemo(() => {
    return itemsForTotals.reduce((acc, it) => {
      if (it.isManualPricing || it.itemType === "meal" || it.itemType === "free_time") return acc;
      return acc + (it.subtotalNetCop ?? 0);
    }, 0);
  }, [itemsForTotals]);

  const manualCop = useMemo(() => {
    return itemsForTotals.reduce((acc, it) => {
      if (it.isManualPricing || it.itemType === "meal" || it.itemType === "free_time") {
        return acc + clientAmountToCop(it.manualLineTotalClient ?? 0, currency);
      }
      return acc;
    }, 0);
  }, [itemsForTotals, currency]);

  const totalSellCop = useMemo(
    () => props.totalPriceCop ?? totalSellCopFromItems(itemsForTotals, marginPct, currency),
    [props.totalPriceCop, itemsForTotals, marginPct, currency],
  );

  const subtotalClient = copToClientAmount(subtotalNetCop, currency);
  const contractSellCop = Math.max(0, totalSellCop - manualCop);
  const marginCop = Math.max(0, contractSellCop - subtotalNetCop);
  const marginClient = copToClientAmount(marginCop, currency);
  const manualClient = copToClientAmount(manualCop, currency);
  const totalClient = copToClientAmount(totalSellCop, currency);
  const perPerson = meta.numTravelers > 0 ? Math.round(totalClient / meta.numTravelers) : totalClient;

  const buildPayload = useCallback((): QuoteEditorPayload => {
    return {
      name: meta.name,
      marginPct: meta.marginPct,
      currency: meta.currency as "EUR" | "USD" | "COP",
      validUntil: meta.validUntil,
      travelStartDate: meta.travelStartDate,
      travelEndDate: meta.travelEndDate,
      durationDays: meta.durationDays,
      numTravelers: meta.numTravelers,
      travelerType: meta.travelerType,
      tier: meta.tier,
      included: linesToIncludedJson(meta.includedText),
      notIncluded: linesToIncludedJson(meta.notIncludedText),
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        destinationId: d.destinationId,
        items: d.items.map((it, idx) => ({
          clientKey: it.clientKey,
          sortOrder: it.sortOrder ?? idx,
          itemType: it.itemType as QuoteEditorPayload["days"][0]["items"][0]["itemType"],
          accommodationId: it.accommodationId,
          experienceId: it.experienceId,
          transportId: it.transportId,
          timeSlot: it.timeSlot,
          startTime: it.startTime || null,
          notesText: it.notesText,
          isOptional: it.isOptional,
          description: it.description,
          isManualPricing: it.isManualPricing,
          manualLineTotalClient: it.manualLineTotalClient,
        })),
      })),
    };
  }, [days, meta]);

  const save = () => {
    startTransition(async () => {
      const r = await saveQuoteDraftAction(props.quoteId, buildPayload());
      if (r.ok) router.refresh();
    });
  };

  const recalc = () => {
    startTransition(async () => {
      await saveQuoteDraftAction(props.quoteId, buildPayload());
      await recalculateQuoteAction(props.quoteId);
      router.refresh();
    });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-slate-200 text-slate-800",
      sent: "bg-blue-100 text-blue-900",
      accepted: "bg-emerald-100 text-emerald-900",
      rejected: "bg-red-100 text-red-900",
      expired: "bg-amber-100 text-amber-950",
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[s] ?? map.draft}`}>{s}</span>
    );
  };

  const updateDayDest = (dayIdx: number, destinationId: string) => {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, destinationId } : d)));
  };

  const updateItem = (dayIdx: number, itemIdx: number, patch: Partial<QuoteItemState>) => {
    setDays((prev) =>
      prev.map((d, di) => {
        if (di !== dayIdx) return d;
        const items = d.items.map((it, ii) => (ii === itemIdx ? { ...it, ...patch } : it));
        return { ...d, items };
      }),
    );
  };

  const addItem = (dayIdx: number) => {
    setDays((prev) =>
      prev.map((d, di) => {
        if (di !== dayIdx) return d;
        const next = [...d.items, emptyItem(d.items.length)];
        return { ...d, items: next };
      }),
    );
  };

  const removeItem = (dayIdx: number, itemIdx: number) => {
    setDays((prev) =>
      prev.map((d, di) => {
        if (di !== dayIdx) return d;
        return { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) };
      }),
    );
  };

  const syncDuration = (n: number) => {
    setMeta((m) => ({ ...m, durationDays: n }));
    setDays((prev) => {
      const defaultDest = prev[0]?.destinationId || props.destinations[0]?.id || "";
      if (prev.length < n) {
        const extra = Array.from({ length: n - prev.length }, (_, i) => ({
          dayNumber: prev.length + i + 1,
          destinationId: prev[prev.length - 1]?.destinationId || defaultDest,
          items: [] as QuoteItemState[],
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, n).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] gap-4">
      <aside
        className={[
          "shrink-0 border-r border-slate-200 pr-4 transition-all dark:border-gray-700",
          sidebarOpen ? "w-full max-w-sm" : "w-10",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="mb-3 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-gray-400"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {sidebarOpen ? "Collapse" : ""}
        </button>

        {sidebarOpen ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</h3>
              <p className="mt-1 font-medium text-slate-900 dark:text-gray-100">{props.client.name}</p>
              <dl className="mt-3 space-y-1 text-xs text-slate-600 dark:text-gray-400">
                <div>
                  <dt className="font-medium text-slate-500">Interests</dt>
                  <dd>{props.discoveryGlance.interests || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Budget</dt>
                  <dd>{props.discoveryGlance.budget || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Guide language</dt>
                  <dd>{props.discoveryGlance.guide || "—"}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-gray-700">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Quote</h3>
              <label className="mt-2 block text-xs font-medium text-slate-600 dark:text-gray-400">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.name}
                onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Status</span> {statusBadge(props.quoteStatus)}
              </div>
              <label className="mt-2 block text-xs font-medium text-slate-600">Margin %</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.marginPct}
                onChange={(e) => setMeta((m) => ({ ...m, marginPct: Number(e.target.value) || 0 }))}
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Currency</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.currency}
                onChange={(e) => setMeta((m) => ({ ...m, currency: e.target.value }))}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </select>
              <label className="mt-2 block text-xs font-medium text-slate-600">Valid until</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.validUntil ? meta.validUntil.slice(0, 16) : ""}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    validUntil: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Travel start</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.travelStartDate ? meta.travelStartDate.slice(0, 10) : ""}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    travelStartDate: e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null,
                  }))
                }
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Travel end</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.travelEndDate ? meta.travelEndDate.slice(0, 10) : ""}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    travelEndDate: e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null,
                  }))
                }
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Duration (days)</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.durationDays}
                onChange={(e) => syncDuration(Number(e.target.value) || 1)}
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Travelers</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.numTravelers}
                onChange={(e) => setMeta((m) => ({ ...m, numTravelers: Number(e.target.value) || 1 }))}
              />
              <label className="mt-2 block text-xs font-medium text-slate-600">Traveler type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.travelerType ?? ""}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    travelerType: (e.target.value || null) as TravelerType | null,
                  }))
                }
              >
                <option value="">—</option>
                {TRAVELERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="mt-2 block text-xs font-medium text-slate-600">Tier</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={meta.tier ?? ""}
                onChange={(e) => setMeta((m) => ({ ...m, tier: (e.target.value || null) as TripTier | null }))}
              >
                <option value="">—</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sticky top-4 rounded-xl border border-teal-200 bg-teal-50/90 p-4 dark:border-teal-900 dark:bg-teal-950/40">
              <h3 className="text-sm font-semibold text-teal-950 dark:text-teal-100">Price summary</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600 dark:text-gray-400">Subtotal (net)</dt>
                  <dd className="font-medium">{formatClientPrice(subtotalClient, currency)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600 dark:text-gray-400">Manual / extras</dt>
                  <dd className="font-medium">{formatClientPrice(manualClient, currency)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600 dark:text-gray-400">Margin ({marginPct}% on contracts)</dt>
                  <dd className="font-medium">{formatClientPrice(marginClient, currency)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-teal-200/80 pt-2 dark:border-teal-800">
                  <dt className="font-semibold text-slate-900 dark:text-gray-100">Total</dt>
                  <dd className="text-lg font-bold text-teal-900 dark:text-teal-100">
                    {formatClientPrice(totalClient, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-xs text-slate-600 dark:text-gray-400">
                  <dt>Per person</dt>
                  <dd>{formatClientPrice(perPerson, currency)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={recalc}
                disabled={pending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100 disabled:opacity-50 dark:border-teal-800 dark:bg-gray-900 dark:text-teal-100 dark:hover:bg-teal-900/50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Recalculate
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/quotes"
            className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
          >
            ← Quotes
          </Link>
          <Link
            href={`/admin/quotes/${props.quoteId}/print`}
            target="_blank"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </button>
          <button
            type="button"
            aria-describedby="quote-send-to-client-help"
            onClick={() =>
              startTransition(async () => {
                await saveQuoteDraftAction(props.quoteId, buildPayload());
                await sendQuoteToClientAction(props.quoteId);
                router.refresh();
              })
            }
            disabled={pending}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
          >
            Send to client
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => markQuoteAcceptedAction(props.quoteId).then(() => router.refresh()))}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            Mark accepted
          </button>
          <div className="flex items-center gap-1">
            <input
              placeholder="Rejection reason"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                startTransition(() =>
                  markQuoteRejectedAction(props.quoteId, rejectReason).then(() => router.refresh()),
                )
              }
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
            >
              Mark rejected
            </button>
          </div>
          {props.quoteStatus === "accepted" ? (
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  void convertQuoteToBookingAction(props.quoteId);
                })
              }
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
            >
              Convert to booking
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                void cloneQuoteAction(props.quoteId);
              })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600"
          >
            Clone quote
          </button>
          </div>
          <p
            id="quote-send-to-client-help"
            className="text-xs leading-snug text-slate-600 dark:text-gray-400"
          >
            <span className="font-medium text-slate-800 dark:text-gray-200">Send to client</span> — enregistre le lien
            d’impression / PDF sur la{" "}
            <Link href={`/admin/clients/${props.client.id}`} className="text-teal-700 underline dark:text-teal-400">
              fiche client
            </Link>
            , envoie un e-mail de revue si{" "}
            <code className="rounded bg-slate-200/80 px-1 font-mono text-[11px] dark:bg-gray-700">QUOTE_REVIEW_EMAIL</code>{" "}
            est défini dans <code className="font-mono text-[11px]">.env</code>, puis passe le devis en « envoyé ».
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Included (one line per bullet, FR)</label>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={meta.includedText}
              onChange={(e) => setMeta((m) => ({ ...m, includedText: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Not included (one line per bullet, FR)</label>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={meta.notIncludedText}
              onChange={(e) => setMeta((m) => ({ ...m, notIncludedText: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-8">
          {days.map((day, dayIdx) => {
            const destName = props.destinations.find((d) => d.id === day.destinationId)?.name ?? "Destination";
            const dayItemsDb = itemsForTotals.filter((it) => it.dayNumber === day.dayNumber);
            const daySellCop = dayItemsDb.reduce((acc, it) => acc + lineSellCop(it, marginPct, currency), 0);

            return (
              <div
                key={day.dayNumber}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-gray-700">
                  <div>
                    <span className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-400">
                      Day {day.dayNumber}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100">{destName}</h3>
                  </div>
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={day.destinationId}
                    onChange={(e) => updateDayDest(dayIdx, e.target.value)}
                  >
                    {props.destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <ul className="mt-4 space-y-3">
                  {day.items.map((it, itemIdx) => {
                    const dbMatch = it.serverId
                      ? itemsForTotals.find((row) => row.id === it.serverId)
                      : undefined;
                    const hasContract = dbMatch && dbMatch.subtotalNetCop != null && !it.isManualPricing;
                    const noContract =
                      (it.itemType === "accommodation" ||
                        it.itemType === "experience" ||
                        it.itemType === "transport") &&
                      !it.isManualPricing &&
                      !hasContract;

                    return (
                      <li
                        key={it.clientKey}
                        className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <select
                            className="rounded border border-slate-300 text-xs dark:border-gray-600 dark:bg-gray-800"
                            value={it.itemType}
                            onChange={(e) =>
                              updateItem(dayIdx, itemIdx, {
                                itemType: e.target.value,
                                accommodationId: null,
                                experienceId: null,
                                transportId: null,
                              })
                            }
                          >
                            {ITEM_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          {it.itemType === "accommodation" ? (
                            <select
                              className="min-w-[200px] flex-1 rounded border border-slate-300 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={it.accommodationId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIdx, itemIdx, { accommodationId: e.target.value || null })
                              }
                            >
                              <option value="">Select hotel</option>
                              {(props.accommodationsByDest[day.destinationId] ?? []).map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {it.itemType === "experience" ? (
                            <select
                              className="min-w-[200px] flex-1 rounded border border-slate-300 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={it.experienceId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIdx, itemIdx, { experienceId: e.target.value || null })
                              }
                            >
                              <option value="">Select experience</option>
                              {(props.experiencesByDest[day.destinationId] ?? []).map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {it.itemType === "transport" ? (
                            <select
                              className="min-w-[220px] flex-1 rounded border border-slate-300 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={it.transportId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIdx, itemIdx, { transportId: e.target.value || null })
                              }
                            >
                              <option value="">Select route</option>
                              {filterTransportsForDay(props.transports, dayIdx, days).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {(it.itemType === "meal" || it.itemType === "free_time") && (
                            <input
                              className="min-w-[160px] flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                              placeholder="Label"
                              value={it.description}
                              onChange={(e) => updateItem(dayIdx, itemIdx, { description: e.target.value })}
                            />
                          )}
                          <button
                            type="button"
                            className="ml-auto rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            onClick={() => removeItem(dayIdx, itemIdx)}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
                          <label className="flex flex-col text-xs text-slate-600 dark:text-gray-400">
                            Manual pricing
                            <input
                              type="checkbox"
                              checked={it.isManualPricing}
                              onChange={(e) =>
                                updateItem(dayIdx, itemIdx, { isManualPricing: e.target.checked })
                              }
                            />
                          </label>
                          <label className="flex flex-col text-xs text-slate-600 dark:text-gray-400">
                            Manual total ({currency})
                            <input
                              type="number"
                              min={0}
                              className="rounded border border-slate-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                              value={it.manualLineTotalClient ?? ""}
                              onChange={(e) =>
                                updateItem(dayIdx, itemIdx, {
                                  manualLineTotalClient: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <div className="text-xs text-slate-600 dark:text-gray-400">
                            <div>Unit net (COP)</div>
                            <div className="font-mono text-slate-900 dark:text-gray-100">
                              {dbMatch?.netUnitCop != null ? dbMatch.netUnitCop.toLocaleString() : "—"}
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-gray-400">
                            <div>Line sell</div>
                            <div className="font-medium text-slate-900 dark:text-gray-100">
                              {dbMatch
                                ? formatClientPrice(
                                    copToClientAmount(lineSellCop(dbMatch, marginPct, currency), currency),
                                    currency,
                                  )
                                : "—"}
                            </div>
                          </div>
                        </div>

                        {noContract ? (
                          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                            No contract — enter price manually (enable manual pricing or set amount).
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => addItem(dayIdx)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </button>
                  <span className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                    Day subtotal: {formatClientPrice(copToClientAmount(daySellCop, currency), currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
