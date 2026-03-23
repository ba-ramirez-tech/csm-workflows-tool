"use client";

import { useMemo, useState, useTransition } from "react";
import { LeadStatus, TravelerType, TripTier } from "@prisma/client";
import { createQuoteAction } from "../actions";

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

const LEAD_BADGE: Record<LeadStatus, string> = {
  NEW: "bg-slate-200 text-slate-800",
  CONTACTED: "bg-sky-100 text-sky-900",
  DISCOVERY_DONE: "bg-violet-100 text-violet-900",
  QUOTED: "bg-amber-100 text-amber-950",
  NEGOTIATING: "bg-orange-100 text-orange-900",
  WON: "bg-emerald-100 text-emerald-900",
  LOST: "bg-red-100 text-red-900",
};

type ClientOpt = { id: string; name: string; leadStatus: LeadStatus };

type TemplateOpt = { id: string; name: string };

type Props = {
  clients: ClientOpt[];
  templates: TemplateOpt[];
};

export function NewQuoteWizard({ clients, templates }: Props) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [mode, setMode] = useState<"template" | "scratch">("template");
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [numTravelers, setNumTravelers] = useState(2);
  const [travelerType, setTravelerType] = useState<TravelerType | "">("");
  const [tier, setTier] = useState<TripTier | "">("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "COP">("EUR");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedTemplate = templates.find((t) => t.id === templateId);

  const filteredClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, search]);

  const suggestedName = useMemo(() => {
    const t = selectedTemplate?.name ?? "Trip";
    const c = selectedClient?.name ?? "Client";
    if (mode === "template" && selectedTemplate && selectedClient) {
      return `${t} — ${c}`;
    }
    if (mode === "scratch" && selectedClient) {
      return `Custom trip — ${c}`;
    }
    return "";
  }, [mode, selectedClient, selectedTemplate]);

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("mode", mode);
    fd.set("templateId", mode === "template" ? templateId : "");
    fd.set("name", name.trim() || suggestedName || "Quote");
    fd.set("durationDays", String(durationDays));
    fd.set("numTravelers", String(numTravelers));
    fd.set("travelerType", travelerType);
    fd.set("tier", tier);
    fd.set("currency", currency);
    startTransition(async () => {
      const r = await createQuoteAction({}, fd);
      if (r?.message && !r.ok) setError(r.message);
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex gap-2 text-sm font-medium text-slate-500">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={[
              "rounded-full px-3 py-1",
              step === s ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-gray-700 dark:text-gray-200",
            ].join(" ")}
          >
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Select client</h2>
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-gray-700">
            {filteredClients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setClientId(c.id);
                    setStep(2);
                  }}
                  className={[
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-800",
                    clientId === c.id ? "bg-teal-50 dark:bg-teal-950/30" : "",
                  ].join(" ")}
                >
                  <span className="font-medium text-slate-900 dark:text-gray-100">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_BADGE[c.leadStatus]}`}>
                    {c.leadStatus.replace("_", " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Starting point</h2>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-gray-700">
            <input
              type="radio"
              name="mode"
              checked={mode === "template"}
              onChange={() => setMode("template")}
            />
            <span>From template</span>
          </label>
          {mode === "template" && (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Choose a published template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-gray-700">
            <input
              type="radio"
              name="mode"
              checked={mode === "scratch"}
              onChange={() => setMode("scratch")}
            />
            <span>From scratch (blank quote)</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-gray-600"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              disabled={mode === "template" && !templateId}
              onClick={() => {
                if (suggestedName && !name) setName(suggestedName);
                setStep(3);
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Basics</h2>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400">Quote name</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={suggestedName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Duration (days)
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Travelers
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={numTravelers}
                onChange={(e) => setNumTravelers(Number(e.target.value) || 1)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Traveler type
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={travelerType}
                onChange={(e) => setTravelerType((e.target.value || "") as TravelerType | "")}
              >
                <option value="">—</option>
                {TRAVELERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Tier
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={tier}
                onChange={(e) => setTier((e.target.value || "") as TripTier | "")}
              >
                <option value="">—</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Currency
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "EUR" | "USD" | "COP")}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </select>
            </label>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-gray-600"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              disabled={pending || !clientId}
              onClick={submit}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create quote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
