"use client";

import { useCallback, useRef, useState } from "react";
import type { TripTier } from "@prisma/client";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BedDouble,
  CableCar,
  Car,
  CarTaxiFront,
  ChevronDown,
  ChevronRight,
  Footprints,
  GripVertical,
  Mountain,
  Plane,
  Plus,
  Route,
  Ship,
  Trash2,
  Truck,
} from "lucide-react";
import {
  patchQuoteDayDetailFieldsAction,
  swapQuoteDayAccommodationAction,
} from "./actions";
import type { QuoteDayState, QuoteItemState } from "./quote-editor-client";
import {
  copToClientAmount,
  lineSellCop,
  type QuoteItemWithRelations,
} from "@/lib/quote-display";
import { formatClientPrice } from "@/lib/client-currency";

type TransportOpt = { id: string; label: string; originId: string; destinationId: string };

export type AccommodationPick = {
  id: string;
  name: string;
  destinationId: string;
  tier: TripTier;
  stars: number | null;
  address: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  roomTypes: unknown;
  netCop: number | null;
  costPerWhat: string | null;
};

const TAG_PRESETS: { label: string; value: string }[] = [
  { label: "City Tour", value: "city_tour" },
  { label: "Nature", value: "nature" },
  { label: "Transfer Day", value: "transfer_day" },
  { label: "Beach", value: "beach" },
  { label: "Coffee", value: "coffee" },
  { label: "Adventure", value: "adventure" },
  { label: "Cultural", value: "cultural" },
  { label: "Free Day", value: "free_day" },
  { label: "Arrival", value: "arrival" },
  { label: "Departure", value: "departure" },
  { label: "Trekking", value: "trekking" },
  { label: "Wildlife", value: "wildlife" },
  { label: "Gastronomy", value: "gastronomy" },
  { label: "Relaxation", value: "relaxation" },
];

const TRANSPORT_TYPE_OPTIONS: { value: string; label: string; Icon: typeof Plane }[] = [
  { value: "domestic_flight", label: "Vol domestique", Icon: Plane },
  { value: "airport_transfer", label: "Transfert aéroport", Icon: Car },
  { value: "taxi_urban", label: "Taxi / urbain", Icon: CarTaxiFront },
  { value: "medium_road", label: "Route (1–3h)", Icon: Route },
  { value: "long_road", label: "Route longue (3h+)", Icon: Route },
  { value: "boat", label: "Bateau", Icon: Ship },
  { value: "horseback", label: "Équitation", Icon: Mountain },
  { value: "walking", label: "Marche / trek", Icon: Footprints },
  { value: "jeep_4x4", label: "4x4", Icon: Truck },
  { value: "cable_metro", label: "Téléphérique / métro", Icon: CableCar },
];

function tagPillClass(tag: string): string {
  const t = tag.toLowerCase();
  if (["cultural", "city_tour"].some((x) => t.includes(x)))
    return "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100";
  if (["nature", "wildlife", "trekking"].some((x) => t.includes(x)))
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
  if (["beach", "relaxation"].some((x) => t.includes(x)))
    return "bg-teal-100 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100";
  if (["adventure"].some((x) => t.includes(x)))
    return "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100";
  if (["transfer_day", "arrival", "departure"].some((x) => t.includes(x)))
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  if (["gastronomy", "coffee"].some((x) => t.includes(x)))
    return "bg-amber-100/90 text-amber-950 dark:bg-amber-900/40 dark:text-amber-50";
  if (["free_day"].some((x) => t.includes(x))) return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  return "bg-teal-50 text-teal-900 dark:bg-teal-950/30 dark:text-teal-100";
}

function dayLeftBorderClass(tags: string[]): string {
  const t = tags.map((x) => x.toLowerCase()).join(" ");
  if (t.includes("transfer") || t.includes("arrival") || t.includes("departure"))
    return "border-l-4 border-l-amber-400";
  if (t.includes("free_day") || t.includes("relaxation")) return "border-l-4 border-l-slate-400";
  if (t.includes("adventure") || t.includes("trekking")) return "border-l-4 border-l-rose-400";
  return "border-l-4 border-l-teal-500";
}

const ITEM_TYPES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "experience", label: "Experience" },
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Meal" },
  { value: "free_time", label: "Free time" },
] as const;

function filterTransportsForDay(transports: TransportOpt[], dayIndex: number, days: QuoteDayState[]): TransportOpt[] {
  const cur = days[dayIndex]?.destinationId;
  const prev = dayIndex > 0 ? days[dayIndex - 1]?.destinationId : null;
  if (!cur) return [];
  return transports.filter((t) => t.originId === cur || (prev != null && t.originId === prev));
}

/** Uses editor day order (so reorder-before-save stays correct). */
function accommodationRunByOrder(
  dayIdx: number,
  orderedDays: QuoteDayState[],
  itemsWithRelations: QuoteItemWithRelations[],
): { start: number; end: number; accId: string; name: string; tier: TripTier | null; stars: number | null } | null {
  const day = orderedDays[dayIdx];
  if (!day) return null;
  const accItem = day.items.find((i) => i.itemType === "accommodation" && i.accommodationId);
  if (!accItem?.accommodationId) return null;
  const dbRow = accItem.serverId ? itemsWithRelations.find((r) => r.id === accItem.serverId) : undefined;
  const name = dbRow?.accommodation?.name ?? "Hotel";
  const tier = dbRow?.accommodation?.tier ?? null;
  const stars = dbRow?.accommodation?.stars ?? null;
  let start = dayIdx;
  while (start > 0) {
    const pacc = orderedDays[start - 1]?.items.some(
      (i) => i.itemType === "accommodation" && i.accommodationId === accItem.accommodationId,
    );
    if (!pacc) break;
    start--;
  }
  let end = dayIdx;
  while (end < orderedDays.length - 1) {
    const nacc = orderedDays[end + 1]?.items.some(
      (i) => i.itemType === "accommodation" && i.accommodationId === accItem.accommodationId,
    );
    if (!nacc) break;
    end++;
  }
  return { start, end, accId: accItem.accommodationId, name, tier, stars };
}

function tierDotClass(tier: TripTier | null): string {
  if (!tier) return "bg-slate-400";
  if (tier === "LUXURY") return "bg-violet-600";
  if (tier === "CHARME") return "bg-teal-600";
  if (tier === "STANDARD") return "bg-slate-500";
  return "bg-amber-600";
}

function newItemKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}`;
}

type BlockProps = {
  sortableId: string;
  quoteId: string;
  day: QuoteDayState;
  dayIdx: number;
  marginPct: number;
  currency: string;
  quoteTier: TripTier | null;
  destinations: { id: string; name: string }[];
  accommodationsByDest: Record<string, { id: string; name: string }[]>;
  experiencesByDest: Record<string, { id: string; name: string }[]>;
  transports: TransportOpt[];
  days: QuoteDayState[];
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
  itemsWithRelations: QuoteItemWithRelations[];
  accommodationPicker: AccommodationPick[];
  schedulePatch: (
    dayDetailId: string | null | undefined,
    dayNumber: number,
    patch: Omit<Parameters<typeof patchQuoteDayDetailFieldsAction>[0], "quoteId" | "dayNumber" | "dayDetailId">,
  ) => void;
};

function QuoteDayBlock(p: BlockProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapBusy, setSwapBusy] = useState(false);
  const [openTransport, setOpenTransport] = useState(true);
  const [openDesc, setOpenDesc] = useState(false);
  const [openAgent, setOpenAgent] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.sortableId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dayIdx = p.dayIdx;
  const destName = p.destinations.find((d) => d.id === p.day.destinationId)?.name ?? "Destination";
  const daySellCop = p.day.items.reduce((acc, it) => {
    const dbMatch = it.serverId ? p.itemsWithRelations.find((r) => r.id === it.serverId) : undefined;
    return acc + (dbMatch ? lineSellCop(dbMatch, p.marginPct, p.currency) : 0);
  }, 0);
  const run = accommodationRunByOrder(dayIdx, p.days, p.itemsWithRelations);
  const showFullAcc = run && run.start === dayIdx;
  const contAcc = run && run.start < dayIdx && run.end >= dayIdx;

  const picker = p.accommodationPicker.filter((a) => a.destinationId === p.day.destinationId);
  const tierOrder: TripTier[] = ["BUDGET", "STANDARD", "CHARME", "LUXURY"];
  const sortedPicker = [...picker].sort((a, b) => {
    if (p.quoteTier) {
      const ia = tierOrder.indexOf(a.tier);
      const ib = tierOrder.indexOf(b.tier);
      if (ia !== ib) return ia - ib;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40",
        isDragging ? "z-20 shadow-lg ring-2 ring-teal-400/80" : "",
        dayLeftBorderClass(p.day.tags),
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start gap-2 border-b border-slate-100 pb-3 dark:border-gray-700">
        <button
          type="button"
          className="mt-1 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
          {...attributes}
          {...listeners}
          aria-label="Réordonner le jour"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 pl-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-400">
              Jour {p.day.dayNumber}
            </span>
            <input
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-base font-semibold dark:border-gray-600 dark:bg-gray-800"
              placeholder="Titre du jour"
              value={p.day.title}
              onChange={(e) =>
                p.setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, title: e.target.value } : d)))
              }
              onBlur={(e) =>
                p.schedulePatch(p.day.dayDetailId, p.day.dayNumber, { title: e.target.value })
              }
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{destName}</p>
        </div>
        <div className="relative flex flex-col items-end gap-1 text-right">
          {showFullAcc && run ? (
            <button
              type="button"
              onClick={() => setSwapOpen((v) => !v)}
              className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-left text-sm font-medium hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-800"
            >
              <BedDouble className="h-4 w-4 shrink-0 text-teal-700" />
              <span className="truncate">{run.name}</span>
              {run.tier ? (
                <span
                  className={["inline-block h-2 w-2 rounded-full", tierDotClass(run.tier)].join(" ")}
                  title={run.tier}
                />
              ) : null}
              {run.stars != null ? <span className="text-xs text-amber-700">{run.stars}★</span> : null}
              {run.end > run.start ? (
                <span className="rounded bg-teal-100 px-1 text-[10px] font-bold text-teal-900">
                  {run.end - run.start + 1} nuits
                </span>
              ) : null}
            </button>
          ) : contAcc && run ? (
            <p className="max-w-[220px] text-xs italic text-slate-500">→ Suite à {run.name}</p>
          ) : (
            <span className="text-xs font-medium text-amber-800">⚠ Hébergement non assigné</span>
          )}
          {swapOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-left text-xs shadow-lg dark:border-gray-600 dark:bg-gray-900">
              <p className="mb-2 font-semibold text-slate-700 dark:text-gray-200">Changer d’hôtel</p>
              <ul className="space-y-1">
                {sortedPicker.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={swapBusy}
                      className="flex w-full flex-col rounded border border-transparent px-2 py-1.5 text-left hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50 dark:hover:bg-teal-950/30"
                      onClick={() => {
                        setSwapBusy(true);
                        void swapQuoteDayAccommodationAction({
                          quoteId: p.quoteId,
                          anchorDayNumber: p.day.dayNumber,
                          accommodationId: a.id,
                        }).then(() => {
                          setSwapBusy(false);
                          setSwapOpen(false);
                          window.location.reload();
                        });
                      }}
                    >
                      <span className="font-medium">{a.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {a.tier}
                        {a.netCop != null
                          ? ` · ${a.netCop.toLocaleString()} COP ${a.costPerWhat ?? ""}`
                          : " · Pas de contrat"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <select
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          value={p.day.destinationId}
          onChange={(e) =>
            p.setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, destinationId: e.target.value } : d)))
          }
        >
          {p.destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Tags</span>
        {p.day.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              const next = p.day.tags.filter((t) => t !== tag);
              p.setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, tags: next } : d)));
              p.schedulePatch(p.day.dayDetailId, p.day.dayNumber, { tags: next });
            }}
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              tagPillClass(tag),
            ].join(" ")}
          >
            {tag.replace(/_/g, " ")}
            <span className="opacity-70">×</span>
          </button>
        ))}
        {TAG_PRESETS.map((preset) =>
          p.day.tags.includes(preset.value) ? null : (
            <button
              key={preset.value}
              type="button"
              className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-400"
              onClick={() => {
                const next = [...p.day.tags, preset.value];
                p.setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, tags: next } : d)));
                p.schedulePatch(p.day.dayDetailId, p.day.dayNumber, { tags: next });
              }}
            >
              + {preset.label}
            </button>
          ),
        )}
        <input
          className="w-28 rounded border border-slate-200 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
          placeholder="tag perso"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const v = e.currentTarget.value.trim().toLowerCase().replace(/\s+/g, "_");
            if (!v || p.day.tags.includes(v)) return;
            e.currentTarget.value = "";
            const next = [...p.day.tags, v];
            p.setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, tags: next } : d)));
            p.schedulePatch(p.day.dayDetailId, p.day.dayNumber, { tags: next });
          }}
        />
      </div>

      <SortableContext
        items={p.day.items.map((it) => `item:${p.day.rowKey}::${it.clientKey}`)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="mt-4 space-y-3">
          {p.day.items.map((it, itemIdx) => (
            <SortableItemRow
              key={it.clientKey}
              id={`item:${p.day.rowKey}::${it.clientKey}`}
              it={it}
              itemIdx={itemIdx}
              dayIdx={dayIdx}
              day={p.day}
              marginPct={p.marginPct}
              currency={p.currency}
              itemsWithRelations={p.itemsWithRelations}
              transports={p.transports}
              allDays={p.days}
              accommodationsByDest={p.accommodationsByDest}
              experiencesByDest={p.experiencesByDest}
              setDays={p.setDays}
            />
          ))}
        </ul>
      </SortableContext>

      <div className="mt-3">
        <button
          type="button"
          onClick={() =>
            p.setDays((prev) =>
              prev.map((d, di) => {
                if (di !== dayIdx) return d;
                const sortOrder = d.items.length;
                const nextItem: QuoteItemState = {
                  serverId: null,
                  clientKey: newItemKey(),
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
                return { ...d, items: [...d.items, nextItem] };
              }),
            )
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      <TransportCollapsible
        day={p.day}
        dayIdx={dayIdx}
        setDays={p.setDays}
        schedulePatch={p.schedulePatch}
        open={openTransport}
        setOpen={setOpenTransport}
      />

      <DescriptionCollapsible
        day={p.day}
        dayIdx={dayIdx}
        setDays={p.setDays}
        schedulePatch={p.schedulePatch}
        open={openDesc}
        setOpen={setOpenDesc}
      />

      <AgentCollapsible
        day={p.day}
        dayIdx={dayIdx}
        setDays={p.setDays}
        schedulePatch={p.schedulePatch}
        open={openAgent}
        setOpen={setOpenAgent}
      />

      <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-gray-700">
        <span className="text-sm font-semibold text-slate-800 dark:text-gray-100">
          Sous-total jour: {formatClientPrice(copToClientAmount(daySellCop, p.currency), p.currency)}
        </span>
      </div>
    </div>
  );
}

function TransportCollapsible({
  day,
  dayIdx,
  setDays,
  schedulePatch,
  open,
  setOpen,
}: {
  day: QuoteDayState;
  dayIdx: number;
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
  schedulePatch: (
    dayDetailId: string | null | undefined,
    dayNumber: number,
    patch: Omit<Parameters<typeof patchQuoteDayDetailFieldsAction>[0], "quoteId" | "dayNumber" | "dayDetailId">,
  ) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 dark:border-gray-600 dark:bg-gray-900/30">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-800 dark:text-gray-200"
        onClick={() => setOpen(!open)}
      >
        Transport & déplacements
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-200 px-3 py-3 dark:border-gray-600">
          {day.transportEntries.map((te, ti) => {
            const Opt = TRANSPORT_TYPE_OPTIONS.find((o) => o.value === te.type)?.Icon ?? Car;
            return (
              <div
                key={ti}
                className="flex flex-wrap items-start gap-2 rounded-md border border-slate-200 bg-white/80 p-2 dark:border-gray-600 dark:bg-gray-800/80"
              >
                <Opt className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
                <select
                  className="rounded border border-slate-300 text-xs dark:border-gray-600 dark:bg-gray-800"
                  value={te.type}
                  onChange={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, type: e.target.value } : row,
                    );
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                    schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: next });
                  }}
                >
                  {TRANSPORT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  className="min-w-[160px] flex-1 rounded border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Trajet"
                  value={te.route}
                  onChange={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, route: e.target.value } : row,
                    );
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                  }}
                  onBlur={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, route: e.target.value } : row,
                    );
                    schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: next });
                  }}
                />
                <input
                  className="w-24 rounded border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Durée"
                  value={te.duration}
                  onChange={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, duration: e.target.value } : row,
                    );
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                  }}
                  onBlur={() => schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: day.transportEntries })}
                />
                <input
                  className="min-w-[120px] flex-1 rounded border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Conseil voyageur"
                  value={te.tip}
                  onChange={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, tip: e.target.value } : row,
                    );
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                  }}
                  onBlur={() => schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: day.transportEntries })}
                />
                <input
                  className="min-w-[120px] flex-1 rounded border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Notes internes"
                  value={te.notes}
                  onChange={(e) => {
                    const next = day.transportEntries.map((row, i) =>
                      i === ti ? { ...row, notes: e.target.value } : row,
                    );
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                  }}
                  onBlur={() => schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: day.transportEntries })}
                />
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => {
                    const next = day.transportEntries.filter((_, i) => i !== ti);
                    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
                    schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: next });
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="text-xs font-medium text-teal-700"
            onClick={() => {
              const next = [
                ...day.transportEntries,
                { type: "airport_transfer", route: "", duration: "", tip: "", notes: "" },
              ];
              setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, transportEntries: next } : d)));
              schedulePatch(day.dayDetailId, day.dayNumber, { transportEntries: next });
            }}
          >
            + Add transport
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DescriptionCollapsible({
  day,
  dayIdx,
  setDays,
  schedulePatch,
  open,
  setOpen,
}: {
  day: QuoteDayState;
  dayIdx: number;
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
  schedulePatch: (
    dayDetailId: string | null | undefined,
    dayNumber: number,
    patch: Omit<Parameters<typeof patchQuoteDayDetailFieldsAction>[0], "quoteId" | "dayNumber" | "dayDetailId">,
  ) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-teal-100 border-l-4 border-l-teal-500 bg-teal-50/20 dark:border-gray-600 dark:bg-teal-950/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen(!open)}
      >
        Description voyage (client)
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open ? (
        <textarea
          className="w-full border-t border-teal-100 bg-white/60 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900/50"
          placeholder="Describe what the client will experience this day..."
          value={day.clientDescription}
          onChange={(e) =>
            setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, clientDescription: e.target.value } : d)))
          }
          onBlur={(e) =>
            schedulePatch(day.dayDetailId, day.dayNumber, { clientDescription: e.target.value })
          }
        />
      ) : null}
    </div>
  );
}

function AgentCollapsible({
  day,
  dayIdx,
  setDays,
  schedulePatch,
  open,
  setOpen,
}: {
  day: QuoteDayState;
  dayIdx: number;
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
  schedulePatch: (
    dayDetailId: string | null | undefined,
    dayNumber: number,
    patch: Omit<Parameters<typeof patchQuoteDayDetailFieldsAction>[0], "quoteId" | "dayNumber" | "dayDetailId">,
  ) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 border-l-4 border-l-slate-400 bg-slate-50/30 dark:border-gray-600 dark:bg-gray-900/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          Notes internes
          <span className="rounded bg-slate-200 px-1.5 py-0 text-[10px] font-bold uppercase dark:bg-gray-700">
            Interne
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open ? (
        <textarea
          className="w-full border-t border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900/60"
          placeholder="Internal notes: backup options, things to confirm, special requests..."
          value={day.agentNotes}
          onChange={(e) =>
            setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, agentNotes: e.target.value } : d)))
          }
          onBlur={(e) => schedulePatch(day.dayDetailId, day.dayNumber, { agentNotes: e.target.value })}
        />
      ) : null}
    </div>
  );
}

function SortableItemRow(props: {
  id: string;
  it: QuoteItemState;
  itemIdx: number;
  dayIdx: number;
  day: QuoteDayState;
  marginPct: number;
  currency: string;
  itemsWithRelations: QuoteItemWithRelations[];
  transports: TransportOpt[];
  allDays: QuoteDayState[];
  accommodationsByDest: Record<string, { id: string; name: string }[]>;
  experiencesByDest: Record<string, { id: string; name: string }[]>;
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: props.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { it, itemIdx, dayIdx, day } = props;

  const dbMatch = it.serverId ? props.itemsWithRelations.find((row) => row.id === it.serverId) : undefined;
  const hasContract = dbMatch && dbMatch.subtotalNetCop != null && !it.isManualPricing;
  const noContract =
    (it.itemType === "accommodation" || it.itemType === "experience" || it.itemType === "transport") &&
    !it.isManualPricing &&
    !hasContract;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50",
        isDragging ? "shadow-md ring-2 ring-teal-400/70" : "",
        isOver ? "ring-2 ring-teal-300" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          aria-label="Réordonner l’item"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <select
          className="rounded border border-slate-300 text-xs dark:border-gray-600 dark:bg-gray-800"
          value={it.itemType}
          onChange={(e) =>
            props.setDays((prev) =>
              prev.map((d, di) => {
                if (di !== dayIdx) return d;
                const items = d.items.map((row, ii) =>
                  ii === itemIdx
                    ? {
                        ...row,
                        itemType: e.target.value,
                        accommodationId: null,
                        experienceId: null,
                        transportId: null,
                      }
                    : row,
                );
                return { ...d, items };
              }),
            )
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
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx ? { ...row, accommodationId: e.target.value || null } : row,
                  );
                  return { ...d, items };
                }),
              )
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
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx ? { ...row, experienceId: e.target.value || null } : row,
                  );
                  return { ...d, items };
                }),
              )
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
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx ? { ...row, transportId: e.target.value || null } : row,
                  );
                  return { ...d, items };
                }),
              )
            }
          >
            <option value="">Select route</option>
            {filterTransportsForDay(props.transports, dayIdx, props.allDays).map((t) => (
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
            onChange={(e) =>
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx ? { ...row, description: e.target.value } : row,
                  );
                  return { ...d, items };
                }),
              )
            }
          />
        )}
        <button
          type="button"
          className="ml-auto rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          onClick={() =>
            props.setDays((prev) =>
              prev.map((d, di) =>
                di === dayIdx ? { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) } : d,
              ),
            )
          }
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
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx ? { ...row, isManualPricing: e.target.checked } : row,
                  );
                  return { ...d, items };
                }),
              )
            }
          />
        </label>
        <label className="flex flex-col text-xs text-slate-600 dark:text-gray-400">
          Manual total ({props.currency})
          <input
            type="number"
            min={0}
            className="rounded border border-slate-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
            value={it.manualLineTotalClient ?? ""}
            onChange={(e) =>
              props.setDays((prev) =>
                prev.map((d, di) => {
                  if (di !== dayIdx) return d;
                  const items = d.items.map((row, ii) =>
                    ii === itemIdx
                      ? {
                          ...row,
                          manualLineTotalClient: e.target.value === "" ? null : Number(e.target.value),
                        }
                      : row,
                  );
                  return { ...d, items };
                }),
              )
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
                  copToClientAmount(lineSellCop(dbMatch, props.marginPct, props.currency), props.currency),
                  props.currency,
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
}

type SectionProps = {
  quoteId: string;
  days: QuoteDayState[];
  setDays: React.Dispatch<React.SetStateAction<QuoteDayState[]>>;
  marginPct: number;
  currency: string;
  itemsWithRelations: QuoteItemWithRelations[];
  quoteTier: TripTier | null;
  destinations: { id: string; name: string }[];
  accommodationsByDest: Record<string, { id: string; name: string }[]>;
  experiencesByDest: Record<string, { id: string; name: string }[]>;
  transports: TransportOpt[];
  accommodationPicker: AccommodationPick[];
};

export function QuoteEditorDaysSection(props: SectionProps) {
  const descTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const schedulePatch = useCallback(
    (
      dayDetailId: string | null | undefined,
      dayNumber: number,
      patch: Omit<Parameters<typeof patchQuoteDayDetailFieldsAction>[0], "quoteId" | "dayNumber" | "dayDetailId">,
    ) => {
      const k = `${props.quoteId}-${dayDetailId ?? `n:${dayNumber}`}`;
      const prev = descTimers.current[k];
      if (prev) clearTimeout(prev);
      descTimers.current[k] = setTimeout(() => {
        void patchQuoteDayDetailFieldsAction({
          quoteId: props.quoteId,
          dayNumber,
          dayDetailId: dayDetailId ?? undefined,
          ...patch,
        });
      }, 500);
    },
    [props.quoteId],
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (aid.startsWith("day:")) {
      const ids = props.days.map((d) => `day:${d.rowKey}`);
      const oldIndex = ids.indexOf(aid);
      const newIndex = ids.indexOf(oid);
      if (oldIndex < 0 || newIndex < 0) return;
      props.setDays((prev) =>
        arrayMove(prev, oldIndex, newIndex).map((d, i) => ({
          ...d,
          dayNumber: i + 1,
        })),
      );
      return;
    }
    if (aid.startsWith("item:")) {
      const [, dayKey, itemKey] = aid.split("::");
      const dayIdx = props.days.findIndex((d) => d.rowKey === dayKey);
      if (dayIdx < 0) return;
      if (!oid.startsWith("item:")) return;
      const parts = oid.split("::");
      if (parts[1] !== dayKey) return;
      const overItemKey = parts[2];
      props.setDays((prev) =>
        prev.map((d, di) => {
          if (di !== dayIdx) return d;
          const keys = d.items.map((it) => it.clientKey);
          const oi = keys.indexOf(itemKey);
          const ni = keys.indexOf(overItemKey);
          if (oi < 0 || ni < 0) return d;
          const items = arrayMove(d.items, oi, ni).map((it, i) => ({ ...it, sortOrder: i }));
          return { ...d, items };
        }),
      );
    }
  };

  const dayIds = props.days.map((d) => `day:${d.rowKey}`);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-8">
          {props.days.map((day, dayIdx) => (
            <QuoteDayBlock
              key={day.rowKey}
              sortableId={`day:${day.rowKey}`}
              quoteId={props.quoteId}
              day={day}
              dayIdx={dayIdx}
              marginPct={props.marginPct}
              currency={props.currency}
              quoteTier={props.quoteTier}
              destinations={props.destinations}
              accommodationsByDest={props.accommodationsByDest}
              experiencesByDest={props.experiencesByDest}
              transports={props.transports}
              days={props.days}
              setDays={props.setDays}
              itemsWithRelations={props.itemsWithRelations}
              accommodationPicker={props.accommodationPicker}
              schedulePatch={schedulePatch}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
