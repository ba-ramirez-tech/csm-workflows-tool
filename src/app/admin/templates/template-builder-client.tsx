"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TravelerType, TripTier } from "@prisma/client";
import { CLIENT_CURRENCY_OPTIONS, DEFAULT_CLIENT_CURRENCY } from "@/lib/client-currency";
import type { TemplateBuilderSaveState } from "./actions";
import { saveTemplateBuilderAction, saveTemplateMetadataAction } from "./actions";
import { slugify } from "@/lib/slug";

export type BuilderItemState = {
  clientId: string;
  sortOrder: number;
  itemType: string;
  accommodationId: string | null;
  experienceId: string | null;
  transportId: string | null;
  timeSlot: string | null;
  startTime: string | null;
  isOptional: boolean;
  notesText: string;
};

export type BuilderDayState = {
  dayNumber: number;
  destinationId: string;
  title: string;
  items: BuilderItemState[];
};

type DestinationOpt = { id: string; name: string };
type EntityOpt = { id: string; name: string };
type TransportOpt = { id: string; label: string; originId: string; destinationId: string };

type TemplateBuilderClientProps = {
  templateId: string;
  initialMeta: {
    name: string;
    slug: string;
    travelerTypes: TravelerType[];
    tier: TripTier;
    durationDays: number;
    description: string;
    basePriceAmount: number | null;
    clientCurrency: string;
    webProductUrl: string;
    tags: string[];
    isPublished: boolean;
    isActive: boolean;
  };
  initialDays: BuilderDayState[];
  destinations: DestinationOpt[];
  accommodationsByDest: Record<string, EntityOpt[]>;
  experiencesByDest: Record<string, EntityOpt[]>;
  transports: TransportOpt[];
};

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
const ITEM_TYPES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "experience", label: "Experience" },
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Meal" },
  { value: "free_time", label: "Free time" },
] as const;
const TIME_SLOTS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "full_day", label: "Full day" },
] as const;

function newClientId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyItem(sortOrder: number): BuilderItemState {
  return {
    clientId: newClientId(),
    sortOrder,
    itemType: "accommodation",
    accommodationId: null,
    experienceId: null,
    transportId: null,
    timeSlot: "morning",
    startTime: "",
    isOptional: false,
    notesText: "",
  };
}

function emptyDay(dayNumber: number, destinationId: string): BuilderDayState {
  return { dayNumber, destinationId, title: "", items: [] };
}

function filterTransportsForDay(
  transports: TransportOpt[],
  dayIndex: number,
  days: BuilderDayState[],
): TransportOpt[] {
  const cur = days[dayIndex]?.destinationId;
  const prev = dayIndex > 0 ? days[dayIndex - 1]?.destinationId : null;
  if (!cur) return [];
  return transports.filter((t) => t.originId === cur || (prev != null && t.originId === prev));
}

export function TemplateBuilderClient({
  templateId,
  initialMeta,
  initialDays,
  destinations,
  accommodationsByDest,
  experiencesByDest,
  transports,
}: TemplateBuilderClientProps) {
  const router = useRouter();
  const [meta, setMeta] = useState(initialMeta);
  const [days, setDays] = useState<BuilderDayState[]>(() =>
    initialDays.map((d) => ({
      ...d,
      items: d.items.map((it, idx) => ({ ...it, sortOrder: it.sortOrder ?? idx })),
    })),
  );

  const [slugTouched, setSlugTouched] = useState(false);
  const [metaPending, startMetaTransition] = useTransition();
  const [metaMsg, setMetaMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fullSaveAction = useCallback(saveTemplateBuilderAction.bind(null, templateId), [templateId]);
  const [saveState, saveFormAction, savePending] = useActionState(
    fullSaveAction,
    {} as TemplateBuilderSaveState,
  );

  const prevSavePending = useRef(savePending);
  useEffect(() => {
    const saveJustFinished = prevSavePending.current && !savePending;
    prevSavePending.current = savePending;
    if (saveJustFinished && saveState.ok === true) {
      router.refresh();
    }
  }, [savePending, saveState.ok, router]);

  const payloadJson = useMemo(() => {
    const p = {
      name: meta.name,
      slug: meta.slug,
      travelerTypes: meta.travelerTypes,
      tier: meta.tier,
      durationDays: meta.durationDays,
      description: meta.description,
      basePriceAmount: meta.basePriceAmount,
      clientCurrency: meta.clientCurrency,
      webProductUrl: meta.webProductUrl.trim() || null,
      tags: meta.tags,
      isPublished: meta.isPublished,
      isActive: meta.isActive,
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        destinationId: d.destinationId,
        title: d.title,
        items: d.items.map((it, idx) => ({
          sortOrder: it.sortOrder ?? idx,
          itemType: it.itemType,
          accommodationId: it.accommodationId,
          experienceId: it.experienceId,
          transportId: it.transportId,
          timeSlot: it.timeSlot,
          startTime: it.startTime || null,
          isOptional: it.isOptional,
          notesText: it.notesText,
        })),
      })),
    };
    return JSON.stringify(p);
  }, [meta, days]);

  const syncDaysToDuration = useCallback((n: number) => {
    setDays((prev) => {
      const defaultDest = prev[0]?.destinationId || destinations[0]?.id || "";
      if (prev.length === n) return prev;
      if (prev.length < n) {
        const extra = Array.from({ length: n - prev.length }, (_, i) =>
          emptyDay(prev.length + i + 1, prev[prev.length - 1]?.destinationId || defaultDest),
        );
        return [...prev, ...extra];
      }
      return prev.slice(0, n).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  }, [destinations]);

  const moveDay = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= days.length) return;
    setDays((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const moveItem = (dayIndex: number, itemIndex: number, dir: -1 | 1) => {
    const j = itemIndex + dir;
    setDays((prev) => {
      const day = prev[dayIndex];
      if (!day || j < 0 || j >= day.items.length) return prev;
      const items = [...day.items];
      [items[itemIndex], items[j]] = [items[j], items[itemIndex]];
      const reordered = items.map((it, idx) => ({ ...it, sortOrder: idx }));
      const copy = [...prev];
      copy[dayIndex] = { ...day, items: reordered };
      return copy;
    });
  };

  const addItem = (dayIndex: number) => {
    setDays((prev) => {
      const copy = [...prev];
      const day = copy[dayIndex];
      if (!day) return prev;
      const next = emptyItem(day.items.length);
      copy[dayIndex] = { ...day, items: [...day.items, next] };
      return copy;
    });
  };

  const removeItem = (dayIndex: number, itemId: string) => {
    setDays((prev) => {
      const copy = [...prev];
      const day = copy[dayIndex];
      if (!day) return prev;
      copy[dayIndex] = {
        ...day,
        items: day.items
          .filter((it) => it.clientId !== itemId)
          .map((it, idx) => ({ ...it, sortOrder: idx })),
      };
      return copy;
    });
  };

  const updateDay = (dayIndex: number, patch: Partial<BuilderDayState>) => {
    setDays((prev) => {
      const copy = [...prev];
      const d = copy[dayIndex];
      if (!d) return prev;
      copy[dayIndex] = { ...d, ...patch };
      return copy;
    });
  };

  const updateItem = (dayIndex: number, itemId: string, patch: Partial<BuilderItemState>) => {
    setDays((prev) => {
      const copy = [...prev];
      const day = copy[dayIndex];
      if (!day) return prev;
      copy[dayIndex] = {
        ...day,
        items: day.items.map((it) => (it.clientId === itemId ? { ...it, ...patch } : it)),
      };
      return copy;
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-80">
        <details open className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Template metadata
          </summary>
          <div className="border-t border-slate-100 px-4 py-4">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setMetaMsg(null);
                const fd = new FormData();
                fd.set("name", meta.name);
                fd.set("slug", meta.slug);
                fd.set("tier", meta.tier);
                fd.set("durationDays", String(meta.durationDays));
                fd.set("description", meta.description);
                fd.set("basePriceAmount", meta.basePriceAmount != null ? String(meta.basePriceAmount) : "");
                fd.set("clientCurrency", meta.clientCurrency || DEFAULT_CLIENT_CURRENCY);
                fd.set("webProductUrl", meta.webProductUrl);
                fd.set("tags", meta.tags.join(", "));
                if (meta.isPublished) fd.set("isPublished", "on");
                if (meta.isActive) fd.set("isActive", "on");
                meta.travelerTypes.forEach((t) => fd.append("travelerTypes", t));
                startMetaTransition(async () => {
                  const res = await saveTemplateMetadataAction(templateId, {}, fd);
                  setMetaMsg({
                    text: res.message ?? "",
                    ok: Boolean(res.ok),
                  });
                  if (res.ok) router.refresh();
                });
              }}
            >
              <p className="text-xs text-slate-500">
                Edit fields below, then save. Changing duration adds/removes days on the server.
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                <input
                  value={meta.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setMeta((m) => ({
                      ...m,
                      name,
                      slug: slugTouched ? m.slug : slugify(name),
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Slug</label>
                <input
                  value={meta.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setMeta((m) => ({ ...m, slug: e.target.value }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-xs"
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-600">Traveler profiles</span>
                <div className="flex flex-wrap gap-2">
                  {TRAVELERS.map((t) => (
                    <label key={t} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={meta.travelerTypes.includes(t)}
                        onChange={() => {
                          setMeta((m) => ({
                            ...m,
                            travelerTypes: m.travelerTypes.includes(t)
                              ? m.travelerTypes.filter((x) => x !== t)
                              : [...m.travelerTypes, t],
                          }));
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tier</label>
                <select
                  value={meta.tier}
                  onChange={(e) => setMeta((m) => ({ ...m, tier: e.target.value as TripTier }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={meta.durationDays}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(365, Number(e.target.value) || 1));
                    setMeta((m) => ({ ...m, durationDays: n }));
                    syncDaysToDuration(n);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <textarea
                  value={meta.description}
                  onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Client currency</label>
                <select
                  value={meta.clientCurrency}
                  onChange={(e) => setMeta((m) => ({ ...m, clientCurrency: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {CLIENT_CURRENCY_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Base price (per person, whole units in selected currency)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={meta.basePriceAmount ?? ""}
                  onChange={(e) =>
                    setMeta((m) => ({
                      ...m,
                      basePriceAmount: e.target.value === "" ? null : Math.max(0, Math.trunc(Number(e.target.value))),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Web product URL</label>
                <input
                  type="url"
                  value={meta.webProductUrl}
                  onChange={(e) => setMeta((m) => ({ ...m, webProductUrl: e.target.value }))}
                  placeholder="https://www.colombiesurmesure.com/circuits/…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={meta.tags.join(", ")}
                  onChange={(e) =>
                    setMeta((m) => ({
                      ...m,
                      tags: e.target.value
                        .split(/[,;]+/)
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .slice(0, 60),
                    }))
                  }
                  placeholder="e.g. classic, family, caribbean"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={meta.isPublished}
                  onChange={(e) => setMeta((m) => ({ ...m, isPublished: e.target.checked }))}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={meta.isActive}
                  onChange={(e) => setMeta((m) => ({ ...m, isActive: e.target.checked }))}
                />
                Active
              </label>

              <button
                type="submit"
                disabled={metaPending}
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {metaPending ? "Saving…" : "Save metadata"}
              </button>
              {metaMsg && (
                <p className={`text-xs ${metaMsg.ok ? "text-emerald-700" : "text-rose-600"}`}>{metaMsg.text}</p>
              )}
            </form>
          </div>
        </details>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Day-by-day itinerary</h2>
          <div className="flex flex-wrap gap-2">
            <form action={saveFormAction}>
              <input type="hidden" name="payload" value={payloadJson} readOnly />
              <button
                type="submit"
                disabled={savePending}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {savePending ? "Saving…" : "Save full template"}
              </button>
            </form>
          </div>
        </div>

        {saveState.message && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              saveState.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {saveState.message}
          </div>
        )}

        <div className="relative space-y-6 border-l-2 border-slate-200 pl-6">
          {days.map((day, dayIndex) => (
            <div key={day.dayNumber} className="relative">
              <span className="absolute -left-[1.4rem] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                {day.dayNumber}
              </span>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">Day {day.dayNumber}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveDay(dayIndex, -1)}
                      disabled={dayIndex === 0}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Day ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDay(dayIndex, 1)}
                      disabled={dayIndex === days.length - 1}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Day ↓
                    </button>
                  </div>
                </div>

                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Destination</label>
                    <select
                      value={day.destinationId}
                      onChange={(e) => updateDay(dayIndex, { destinationId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
                    <input
                      value={day.title}
                      onChange={(e) => updateDay(dayIndex, { title: e.target.value })}
                      placeholder="e.g. Bogotá — City tour"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {day.items.map((item, itemIndex) => {
                    const accs = accommodationsByDest[day.destinationId] ?? [];
                    const exps = experiencesByDest[day.destinationId] ?? [];
                    const routes = filterTransportsForDay(transports, dayIndex, days);
                    return (
                      <div
                        key={item.clientId}
                        className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <div className="flex shrink-0 flex-col gap-1 pt-1">
                          <button
                            type="button"
                            aria-label="Move up"
                            onClick={() => moveItem(dayIndex, itemIndex, -1)}
                            disabled={itemIndex === 0}
                            className="rounded border border-slate-300 px-1.5 text-xs leading-none disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            onClick={() => moveItem(dayIndex, itemIndex, 1)}
                            disabled={itemIndex === day.items.length - 1}
                            className="rounded border border-slate-300 px-1.5 text-xs leading-none disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
                                Type
                              </label>
                              <select
                                value={item.itemType}
                                onChange={(e) =>
                                  updateItem(dayIndex, item.clientId, {
                                    itemType: e.target.value,
                                    accommodationId: null,
                                    experienceId: null,
                                    transportId: null,
                                  })
                                }
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                {ITEM_TYPES.map((it) => (
                                  <option key={it.value} value={it.value}>
                                    {it.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
                                Time slot
                              </label>
                              <select
                                value={item.timeSlot ?? ""}
                                onChange={(e) =>
                                  updateItem(dayIndex, item.clientId, {
                                    timeSlot: e.target.value || null,
                                  })
                                }
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                <option value="">—</option>
                                {TIME_SLOTS.map((ts) => (
                                  <option key={ts.value} value={ts.value}>
                                    {ts.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {item.itemType === "accommodation" && (
                            <select
                              value={item.accommodationId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, {
                                  accommodationId: e.target.value || null,
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Select…</option>
                              {accs.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {item.itemType === "experience" && (
                            <select
                              value={item.experienceId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, {
                                  experienceId: e.target.value || null,
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Select…</option>
                              {exps.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {item.itemType === "transport" && (
                            <select
                              value={item.transportId ?? ""}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, {
                                  transportId: e.target.value || null,
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Select…</option>
                              {routes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {(item.itemType === "meal" || item.itemType === "free_time") && (
                            <input
                              value={item.notesText}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, { notesText: e.target.value })
                              }
                              placeholder={
                                item.itemType === "meal"
                                  ? "e.g. Lunch included at local restaurant"
                                  : "e.g. Free afternoon to explore"
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                          )}

                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={item.startTime ?? ""}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, { startTime: e.target.value })
                              }
                              placeholder="Start time (e.g. 08:00)"
                              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={item.isOptional}
                                onChange={(e) =>
                                  updateItem(dayIndex, item.clientId, { isOptional: e.target.checked })
                                }
                              />
                              Optional activity
                            </label>
                          </div>
                          {item.itemType !== "meal" && item.itemType !== "free_time" && (
                            <textarea
                              value={item.notesText}
                              onChange={(e) =>
                                updateItem(dayIndex, item.clientId, { notesText: e.target.value })
                              }
                              placeholder="Notes"
                              rows={2}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(dayIndex, item.clientId)}
                          className="shrink-0 self-start rounded border border-rose-200 px-2 py-1 text-sm text-rose-700 hover:bg-rose-50"
                          aria-label="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => addItem(dayIndex)}
                  className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  + Add item
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
